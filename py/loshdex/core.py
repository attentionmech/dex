# loshdex/core.py

import os
import inspect
import torch
import pandas as pd
import json
from transformers import AutoConfig, AutoModel
from huggingface_hub import HfApi
import pyarrow as pa
import json
import argparse
import pyarrow as pa
from pyarrow import ipc
from IPython.display import IFrame


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

        class_name = get_full_class_name(module) if module else "Unknown"

        try:
            file_path = clean_path(inspect.getfile(type(module)), cwd) if module else "Unknown"
        except Exception:
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


def truncate_value(val, max_len=50):
    if isinstance(val, str):
        return val[:max_len]
    elif isinstance(val, list):
        return [truncate_value(v, max_len) for v in val]
    elif isinstance(val, dict):
        return {k: truncate_value(v, max_len) for k, v in val.items()}
    else:
        return val


def extract_model_data(model_names, max_val_len=50, use_meta_device=True):
    config_list = []
    all_param_infos = []
    
    current_default_device = torch.empty(0).device
    
    if use_meta_device:
        torch.set_default_device("meta")

    try:
        for model_name in model_names:
            print(f"Processing model: {model_name}")
            try:
                config = AutoConfig.from_pretrained(model_name)
                model = AutoModel.from_config(config)

                truncated_config = {k: truncate_value(v, max_val_len) for k, v in config.to_dict().items()}
                truncated_config["model_name"] = model_name
                config_list.append(truncated_config)

                param_info = gather_model_param_shapes_and_numels(model, model_name)
                all_param_infos.extend(param_info)

            except Exception as e:
                print(f"Failed to process {model_name}: {e}")
                continue
    finally:
        
        if use_meta_device:
            torch.set_default_device(current_default_device)
        
    df = pd.DataFrame(all_param_infos)
    return {
        "arrow_data": df,
        "config_list": config_list,
    }


def get_top_liked_models(limit=1000, sort_by="trending_score"):
    api = HfApi()
    return api.list_models(limit=limit, sort=sort_by)


def filter_valid_models(models):
    return [m for m in models if not m.gated and 'custom_code' not in m.tags]




def parse_args():
    parser = argparse.ArgumentParser(description="Extract Hugging Face model param info.")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--sort_by", type=str, default="trending_score")
    parser.add_argument("--output", type=str, default="model_info.arrow")
    parser.add_argument("--config_output", type=str, default="config_list.jsonl")
    return parser.parse_args()



def notebook_dex(model_names, height=600, width=800, base_url="https://getlosh.xyz/dex", use_meta_device=True):
    """
    Renders an iframe to visualize model metadata on getlosh.xyz/dex.

    Args:
        model_names (str or list of str): One or more model names to visualize.
        height (int): Height of the iframe.
        width (int): Width of the iframe.
        base_url (str): Base visualization URL.
    """
    

    if isinstance(model_names, str):
        model_names = [model_names]

    result = extract_model_data(model_names, use_meta_device=use_meta_device)

    def compress_and_encode(obj):
        import json, zlib, base64
        json_str = json.dumps(obj)
        compressed = zlib.compress(json_str.encode("utf-8"))
        b64_encoded = base64.urlsafe_b64encode(compressed).decode("utf-8")
        return b64_encoded

    arrow_json = result["arrow_data"].to_dict(orient="records")
    config_json = result["config_list"]

    arrow_encoded = compress_and_encode(arrow_json)
    config_encoded = compress_and_encode(config_json)

    import urllib.parse
    query_params = {
        "arrow": arrow_encoded,
        "config": config_encoded
    }

    full_url = base_url + "?" + urllib.parse.urlencode(query_params)
    return IFrame(full_url, width=width, height=height)


def main():
    args = parse_args()
    

    top_models = get_top_liked_models(limit=args.limit, sort_by=args.sort_by)
    valid_models = filter_valid_models(top_models)
    model_ids = [m.modelId for m in valid_models]

    result = extract_model_data(model_ids)

    arrow_table = pa.Table.from_pandas(result["arrow_data"])
    with open(args.output, "wb") as f:
        with ipc.RecordBatchFileWriter(f, arrow_table.schema) as writer:
            writer.write_table(arrow_table)

    with open(args.config_output, "w") as f:
        for cfg in result["config_list"]:
            json.dump(cfg, f)
            f.write("\n")

    print(f"Done. Wrote to {args.output} and {args.config_output}")


if __name__ == "__main__":
    main()

