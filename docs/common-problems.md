# Common problems

### such file or directory OUT_DIR

```
ENOENT: no such file or directory, mkdir '/Users/nirtamir/dev/work/obsidian-slidev/dist'
```

Make sure you have dist folder BOTH in your project and that your OUT_DIR env variable already have a folder.

### Node not found
When I create the spawn command it may not found node. It did not work with fnm so I kept volta. I tell the spawn to load `~/.profile` file, just like all the terminals does. I then loads the volta env variable which add the node.js location to the path. This way we can use node to execute the template 

