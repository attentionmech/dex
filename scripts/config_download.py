# /// script
# dependencies = [
#   "huggingface_hub",
#   "transformers",
#   "torch",
#   "pandas",
#   "pyarrow",
# ]
# ///


import os
import argparse
import json
import inspect

from huggingface_hub import HfApi
from transformers import AutoConfig, AutoModel
import torch
import pandas as pd
import pyarrow as pa
import pyarrow.ipc as ipc

torch.set_default_device('meta')


def get_full_class_name(obj):
    cls = type(obj)
    return f"{cls.__module__}.{cls.__qualname__}"


def clean_path(path, cwd):
    if "site-packages" in path:
        return path.split("site-packages", 1)[-1].lstrip("/\\")
    elif path.startswith(cwd):
        return os.path.relpath(path, cwd)
    else:
        return path


def categorize_param_type(param_name):
    lname = param_name.lower()
    if "weight" in lname:
        return "weight"
    elif "bias" in lname:
        return "bias"
    elif "norm" in lname:
        return "norm"
    elif "embed" in lname:
        return "embedding"
    else:
        return "other"


def gather_model_param_shapes_and_numels(model, model_name):
    results = []
    seen_param_ids = set()
    cwd = os.getcwd()

    for i, (name, param) in enumerate(model.named_parameters()):
        module = model
        submodules = name.split(".")[:-1]
        param_leaf_name = name.split(".")[-1]
        parent_module_name = ".".join(submodules)
        level = name.count(".")

        try:
            for sub in submodules:
                module = getattr(module, sub)
        except AttributeError:
            module = None

        if module:
            try:
                class_name = get_full_class_name(module)
            except Exception:
                class_name = "Unknown"

            try:
                abs_path = inspect.getfile(type(module))
                file_path = clean_path(abs_path, cwd)
            except Exception:
                file_path = "Unknown"
        else:
            class_name = "Unknown"
            file_path = "Unknown"

        param_id = id(param)
        is_shared = param_id in seen_param_ids
        seen_param_ids.add(param_id)

        param_info = {
            "id": i,
            "model_name": model_name,
            "param_name": name,
            "parent_module": parent_module_name,
            "level": level,
            "numel": param.numel(),
            "shape": str(",".join(map(str, param.shape))),
            "class_name": class_name,
            "file_path": file_path,
            "param_type": categorize_param_type(param_leaf_name),
            "is_shared": is_shared
        }

        results.append(param_info)

    return results


def get_top_liked_models(limit=1000, sort_by="trending_score"):
    api = HfApi()
    models = api.list_models(limit=limit, sort=sort_by)
    return models


def filter_valid_models(models):
    return [m for m in models if not m.gated and 'custom_code' not in m.tags]


def download_and_instantiate_model(model_name):
    try:
        print(f"Loading config for {model_name}...")
        config = AutoConfig.from_pretrained(model_name)
        model = AutoModel.from_config(config)
        return model, config
    except Exception as e:
        print(f"Error with {model_name}: {e}")
        return None, None


def append_to_arrow(new_rows, file_path):
    new_df = pd.DataFrame(new_rows)
    new_table = pa.Table.from_pandas(new_df)

    if os.path.exists(file_path):
        try:
            with open(file_path, "rb") as f:
                reader = ipc.RecordBatchFileReader(f)
                existing_table = reader.read_all()
            combined_table = pa.concat_tables([existing_table, new_table])
        except Exception as e:
            print(f"Error reading existing arrow: {e}. Overwriting.")
            combined_table = new_table
    else:
        combined_table = new_table

    with open(file_path, "wb") as f:
        writer = ipc.RecordBatchFileWriter(f, combined_table.schema)
        writer.write_table(combined_table)
        writer.close()

    print(f"Appended {len(new_rows)} rows to {file_path}")


def load_existing_models(file_path):
    if not os.path.exists(file_path):
        return set()
    try:
        with open(file_path, "rb") as f:
            reader = ipc.RecordBatchFileReader(f)
            table = reader.read_all()
            df = table.to_pandas()
            return set(df['model_name'].unique())
    except Exception as e:
        print(f"Failed to load file {file_path}: {e}")
        return set()


def finalize_arrow(temp_path, final_path):
    os.replace(temp_path, final_path)
    print(f"Renamed {temp_path} to {final_path}")


def append_config_to_jsonl(config, model_name, file_path):
    try:
        with open(file_path, "a", encoding="utf-8") as f:
            data = config.to_dict()
            data["model_name"] = model_name
            json.dump(data, f)
            f.write("\n")
    except Exception as e:
        print(f"Failed to write config for {model_name}: {e}")


def parse_args():
    parser = argparse.ArgumentParser(description="Extract Hugging Face model param info.")
    parser.add_argument("--limit", type=int, default=100, help="Number of models to fetch.")
    parser.add_argument("--sort_by", type=str, default="trending_score", help="HF sort key.")
    parser.add_argument("--output", type=str, default="model_info.arrow", help="Output Arrow file.")
    parser.add_argument("--temp", type=str, default="temp.arrow", help="Temp Arrow file (used during processing).")
    parser.add_argument("--resume", type=str, help="Optional Arrow file to resume from (skips already processed models).")
    parser.add_argument("--config_output", type=str, default="config_list.jsonl", help="Output JSONL file for model configs.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    print(f"Fetching top {args.limit} models sorted by '{args.sort_by}'...")
    top_models = list(get_top_liked_models(limit=args.limit, sort_by=args.sort_by))
    print(f"Found {len(top_models)} models.")

    valid_models = filter_valid_models(top_models)
    print(f"{len(valid_models)} valid models after filtering.")

    already_done = load_existing_models(args.temp)
    print(f"{len(already_done)} models already in temp file.")

    if args.resume:
        resume_done = load_existing_models(args.resume)
        print(f"{len(resume_done)} models found in resume file.")
        already_done |= resume_done

    for model in valid_models:
        model_name = model.modelId
        if model_name in already_done:
            print(f"Skipping already processed: {model_name}")
            continue

        print(f"Processing: {model_name}")
        model_instance, config = download_and_instantiate_model(model_name)

        if model_instance:
            append_config_to_jsonl(config, model_name, args.config_output)

            param_info = gather_model_param_shapes_and_numels(model_instance, model_name)
            append_to_arrow(param_info, args.temp)

            print(f"Done: {model_name}")
        else:
            print(f"Skipped: {model_name}")

    if os.path.exists(args.temp):
        finalize_arrow(args.temp, args.output)
    else:
        print("Nothing was written. Final file not created.")
