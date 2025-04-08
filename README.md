# dex

Visual Explorer for LLMs

![image](https://github.com/user-attachments/assets/ca5d0aa8-4b04-4045-ac7a-5faf27fb4af1)


# demo

<a href="https://getlosh.xyz/dex">live demo</a>

![gifdemodex](https://github.com/user-attachments/assets/89098710-7d42-442b-a306-8835ff8a88a2)



# setup instructions

- we first need to get data from huggingface. for this `scripts/config_download.py` can be run via `uv run` like this: `uv run scripts/config_download.py --output dex/public/model_info.arrow --config_output dex/public/config_list.jsonl --limit 100`
- previous step will put the data files in `public/` folder.
- after this just do `npm install` and `npm run dev` in the `dex` folder. This should start the application.
- for deploying to remote server use `npm run build`

# how this works

- model repos on hf contains metadata files and the transformers repo contains the classes which are supposed to handle a model. we extract that information and save it in assets so that all of this can run in browser. we use torch device meta to avoiding loading stuff into memory.


# citation

```
@article{attentionmech2025dex,
  title={dex: interactive visual explorer for open source LLMs},
  author={attentionmech},
  year={2025}
}
```

# trivia

[This is the post](https://x.com/attentionmech/status/1907967237744468220) where it got started, and this is [where it got viral](https://x.com/attentionmech/status/1908677321688506469).
