# Interview: round 195

The owner's message, 2026-11-27, verbatim:

> We have to clean up the code a bit currently the there is two options for trees either the normal ones or the
> models we always want to be using the models. This is just the default and the only option so remove the code for
> the other trees please this should also make it simpler overall

Claude's question, asked before building (the simple trees are also the level's far-off trees):

> The road's trees come from two places: the "Tree models" setting (on/off), and a distance cut-off. Even with the
> setting on, only the 5 chunks nearest the camera use the models; the other 76 chunks use the simple code-built trees,
> which also stand in for the second or so before the model file loads. I measured seed 4242: models on every chunk
> come to 417,482 triangles against the level's 64,000 budget (6.5× over), and the simple trees come to 48,768. How
> far should the removal go?

The owner's answer: "Remove the setting (Recommended)": delete the "Tree models" toggle and the `treeModels` setting
everywhere, so models are always on; keep the simple trees only as the cheap far-off version and the loading stand-in.
