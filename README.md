# polycubes-viewer

## Description
This viewer was made to load and explore polycubes as computed from the <a href="https://github.com/mikepound/opencubes">Opencubes</a> project.
Kudos to Mike Pound for starting this project, people managing the repo and others mathematicians before him that worked hard on pushing the computational limit.
for the moment, this is a static web project with only simple HTML5, CSS and JavaScript.
The 3D rendering is made with the [three.js](https://github.com/mrdoob/three.js/) library.
The GUI is handled by the [dat.GUI](https://github.com/dataarts/dat.gui)



## How to run
For running this project locally, you have to create a local server.
If you are using VSCode, please install the Live Server Extension.
An other simple way to run a server is to use Python with the following command line.

> python -m http.server 8080

and then access this url with your browser

> localhost:8080/index.html

## Data
Simple polycubes dataset are available in the project, they were produced using scripts and programs from the OpenCube project.


## Format
The current format for storing and loading the polycubes is the following