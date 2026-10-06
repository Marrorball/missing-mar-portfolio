import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { flightDuration, flightProgress, flightOrientation } from '../assets/js/kiosk/motion.js';

test('camera travel has gentle endpoints and no cubic sprint in the middle', () => {
  assert.equal(flightProgress(0), 0);
  assert.equal(flightProgress(1), 1);
  const h = 1e-4;
  assert.ok(flightProgress(h) / h < .001);
  assert.ok((1 - flightProgress(1 - h)) / h < .001);
  assert.ok((flightProgress(.5 + h) - flightProgress(.5 - h)) / (2 * h) < 1.6);
});

test('distance-based trips are a little shorter while retaining a readable walk', () => {
  assert.ok(flightDuration(8, false) < 1760);
  assert.ok(flightDuration(14, true) < 3680);
  assert.ok(flightDuration(14, true) >= 2800);
  assert.ok(flightDuration(0, false) >= 1000);
  assert.ok(flightDuration(100, true) <= 3300);
});

test('opposing views interpolate as a turn without a zero-length look target', () => {
  const fromRotation = new THREE.Quaternion();
  const toRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Math.PI);
  const flight = {fromRotation, toRotation, curve:null};
  const rotation = new THREE.Quaternion();
  let previous = fromRotation.clone();
  for (let i=0;i<=100;i++) {
    flightOrientation(flight,i/100,new THREE.Vector3(),rotation);
    assert.ok(rotation.toArray().every(Number.isFinite));
    assert.ok(Math.abs(rotation.length()-1)<1e-10);
    assert.ok(previous.angleTo(rotation)<.05);
    previous.copy(rotation);
  }
  assert.ok(rotation.angleTo(toRotation)<1e-7);
});

test('walking turns remain continuous and settle exactly on the destination', () => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.4,2.5,8.5), new THREE.Vector3(3.9,1.6,1.6),
    new THREE.Vector3(3.9,1.65,-.9), new THREE.Vector3(.6,1.6,-2.6),
    new THREE.Vector3(.6,1.6,-1), new THREE.Vector3(.6,1.6,-.45), new THREE.Vector3(1.1,1.65,-.2)
  ],false,'centripetal');
  const camera = new THREE.PerspectiveCamera();
  camera.position.copy(curve.getPointAt(0)); camera.lookAt(-.35,1.4,.2);
  const fromRotation = camera.quaternion.clone();
  camera.position.copy(curve.getPointAt(1)); camera.lookAt(-.55,.9,.02);
  const toRotation = camera.quaternion.clone();
  const flight = {curve,fromRotation,toRotation,toTarget:new THREE.Vector3(-.55,.9,.02)};
  const rotation = new THREE.Quaternion();
  let previous = fromRotation.clone();
  for(let i=0;i<=300;i++) {
    const k=flightProgress(i/300);
    flightOrientation(flight,k,curve.getPointAt(k),rotation);
    assert.ok(previous.angleTo(rotation)<.08, `continuous turn at ${i}`);
    previous.copy(rotation);
  }
  assert.ok(rotation.angleTo(toRotation)<1e-7, 'no snap on arrival');
});

test('walking from the DVD rack to the room never flips its turn at 180 degrees', () => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.35,1.3,4.85), new THREE.Vector3(-2.9,1.5,2.9),
    new THREE.Vector3(-2.9,1.65,-1.2), new THREE.Vector3(.6,1.6,-2.6),
    new THREE.Vector3(.6,1.6,-1), new THREE.Vector3(.6,1.6,-.45), new THREE.Vector3(1.1,1.65,-.2)
  ],false,'centripetal');
  const camera=new THREE.PerspectiveCamera();
  camera.position.copy(curve.getPointAt(0)); camera.lookAt(-2.35,1.03,1.85);
  const fromRotation=camera.quaternion.clone();
  camera.position.copy(curve.getPointAt(1)); camera.lookAt(-.55,.9,.02);
  const toRotation=camera.quaternion.clone();
  const flight={curve,fromRotation,toRotation,toTarget:new THREE.Vector3(-.55,.9,.02)};
  const rotation=new THREE.Quaternion(); let previous=fromRotation.clone();
  for(let i=0;i<=3000;i++) {
    const k=i/3000;
    flightOrientation(flight,k,curve.getPointAt(k),rotation);
    assert.ok(previous.angleTo(rotation)<.025,`no sudden yaw flip at ${k}`);
    previous.copy(rotation);
  }
});
