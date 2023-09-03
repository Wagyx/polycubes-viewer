# polycubes-viewer

## Description
This viewer enables to load and explore polycubes as computed from the 
[Opencubes](https://github.com/mikepound/opencubes) project.
Kudos to Mike Pound for starting this project, people managing the repo and others mathematicians before him that worked hard on pushing the computational limit.

For the moment, this is a static web project with only simple HTML5, CSS and JavaScript.
The 3D rendering is made with the [three.js](https://github.com/mrdoob/three.js/) library.
The GUI is handled by the [dat.GUI](https://github.com/dataarts/dat.gui) library.



## How to run
For running this project locally, you have to create a local server.
If you are using VSCode, please install the Live Server Extension.
An other simple way is to use Python with the following command line:

> python -m http.server 8080

and then access this url with your browser

> localhost:8080/index.html

## Data
Simple polycubes dataset are available in the project, they were produced using scripts and programs from the OpenCube project.


## Format
The format under use for storing and loading the polycubes is described in [this post](https://github.com/mikepound/opencubes/issues/8#issuecomment-1634163946). It was chosen for its simplicity.

Given a polycube that fits into a grid of shape (x,y,z), it is stored as:
> x     y     z     data
>
> [byte][byte][byte][bytes...]
> 
where data is the flattened 3D array where each bit indicates whether a cube occupies the position (1) or not (0).
The size of the data bytes is ceil(xyz/8) with zero padding.
See packing.py for the generating code.
