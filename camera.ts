// Hurray, ECMAScript 2015!
import { Point3D, rotatePoints } from "./quaternion";

// A model (object) living in the world.
// A model should have 3D coordinates in 'model space'
// So that the center of mass of the model is the origin in model space
class Model {
  name: string
  verts: Point3D[]
  faces: number[][]

  constructor(verts: Point3D[], faces: number[][], name = ''){
    this.name = name
    this.verts = verts
    this.faces = []
    faces.forEach( face => this.addFace(face) )
  }

  isValidFace(face: number[]){
    let nverts = this.verts.length;
    if (face[0] != face.length - 1){
      return false; // PLY format not followed
    }
    let inds = face.slice(1, face.length);
    if ( !inds.every( ind => nverts >= ind ) ){
      return false;
    }
    return true;
  }

  addFace(face: number[]){
    if (this.isValidFace(face)){
      this.faces.push(face.slice(1, face.length));
    } else{
      console.log(face)
      throw `Tried to add an invalid face to Model ${this.name}`
    }
  }

  rotateModel(){
    let v = new Point3D(1, 0, 0); // 'wlog'
    var time = performance.now() / 60 ** 4;
    this.verts = rotatePoints(this.verts, v, (2 * Math.PI) * time);
    
  }

  translateModel(v: Point3D){
    // TODO
  }

}

// TODO: move this to quaternion
const enum RotationAxis {
  zAxis,
  xyPlane
}

class CanvasPoint {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class Camera {
  position: Point3D;

  xlim: number; // limits of the projecting screen
  ylim: number;

  canvas_xlim: number; // inherited from the canvas
  canvas_ylim: number;

  ctx: any; // for drawing

  radius: number; // radius of drawn points
  world: Point3D[]; // TODO: update
  render: Point3D[];

  faces: number[][];

  models: Model[];
  theta: number;
  phi: number;

  constructor(xlim: number, ylim: number, canvas: HTMLCanvasElement) {
    this.position = new Point3D(0, 0, -2);

    this.xlim = xlim;
    this.ylim = ylim;

    this.canvas_xlim = canvas.width / 2;
    this.canvas_ylim = canvas.height / 2;

    this.ctx = canvas.getContext("2d");

    this.radius = 5;


    this.faces = [];

    this.models = [];

    this.theta = 0;
    this.phi = 0;
  }
}

// Overload a point with a model so we can rotate things independently.
function addModelToWorld(c: Camera, m: Model){
  c.models.push(m);
}

/* The world is a set of points. To make the camera see a point, we need to
    add it to the world. */

function renderModel(c: Camera, m: Model){
  let pts = m.verts //m.verts;
  let faces = m.faces;

  pts.forEach(pt =>
    displayPoint(c, snapPoint(c, pt))
  );
  
  faces.forEach(face =>
    displayFace(c, face)
  ); 

}

// TODO: refactor to handle more than 1 model
function renderWorld(c: Camera) {
  c.ctx.clearRect(0, 0, c.canvas_xlim * 2, c.canvas_ylim * 2);
  renderModel(c, c.models[0])
}

/* Internals */

function displayFace(c: Camera, face: number[]){
  if (c.ctx) {
    let m = c.models[0]; // Fix this
    let pts = m.verts.map( pt => snapPoint(c, pt))
    pts = pts.filter( pt => face.includes( pts.indexOf(pt) ) )
 
    c.ctx.beginPath();
    c.ctx.moveTo( pts[0].x, pts[0].y );

    pts.slice(1, pts.length).forEach(
      pt => c.ctx.lineTo(pt.x, pt.y)
    );
    
    //c.ctx.stroke(); // use c.ctx.fill() for fill triangles
    c.ctx.fillStyle = `rgb(0, ${m.faces.indexOf(face) * 8}, 0)`;
    c.ctx.fill();
  }
}

function displayPoint(c: Camera, p: CanvasPoint) {
  if (c.ctx) {
    c.ctx.beginPath();
    c.ctx.arc(p.x, p.y, c.radius, 0, Math.PI * 2);
    c.ctx.closePath();
    c.ctx.fill();
  }
}

function projectPoint(c: Camera, p: Point3D): number[] {
  // orthographic projection ("lose the z coordinate")
  // return [p.x, p.y];

  // Perspective transformation
  //let [n, f] = [znear, zfar];
  let projected_point = [ // translated from perspective matrix
    (p.x) / (1 - p.z / c.position.z),
    (p.y) / (1 - p.z / c.position.z),
    (p.z) / (1 - p.z / c.position.z)
  ];

  return [projected_point[0], projected_point[1]];
}

// Analogous to the "viewing transform"
function snapPoint(c: Camera, p: Point3D): CanvasPoint {
  // Camera translation
  let tmp = [p.x, p.y, p.z].map(
    (el, i) => el - [c.position.x, c.position.y, c.position.z][i]
  );
  let pt = new Point3D(tmp[0], tmp[1], tmp[2]);
  
  // Camera rotation
  let theta_axis = new Point3D(0, 1, 0);
  let phi_axis = new Point3D(-1, 0, 0);

  pt = rotatePoints([pt], theta_axis, c.theta)[0];
  pt = rotatePoints([pt], phi_axis, c.phi)[0];

  let [x, y] = projectPoint(c, pt);
  y = -y; // The canvas API is weird: pos y corresponds to down

  // transform world coordinates to canvas coordinates.
  x /= c.xlim * 2;
  y /= c.ylim * 2;
  x *= c.canvas_xlim * 2;
  y *= c.canvas_ylim * 2;

  // Translate the points to the canvas origin.
  x += c.canvas_xlim;
  y += c.canvas_ylim;

  return new CanvasPoint(x, y);
}

export { addModelToWorld, renderWorld, Camera, Model };
//export * from "./camera";
