// Shared surface for the printed 3D faces and the readable HTML close-up.
// Neutral white multiplies without changing the ink; darker fibres, damp
// edges and short creases make this a sheet of weathered paper.
export function drawPosterWear(context, width, height) {
  const grain = context.createImageData(width, height);
  let seed = 2004;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < grain.data.length; i += 4) {
    const fibre = random();
    const value = Math.round(246 + fibre * 9);
    grain.data[i] = value;
    grain.data[i + 1] = value - 2;
    grain.data[i + 2] = value - 6;
    grain.data[i + 3] = 255;
  }
  context.putImageData(grain, 0, 0);
  const damp = context.createLinearGradient(0, 0, 0, height);
  damp.addColorStop(0, 'rgba(73,57,36,.14)');
  damp.addColorStop(.10, 'rgba(73,57,36,0)');
  damp.addColorStop(.82, 'rgba(73,57,36,0)');
  damp.addColorStop(1, 'rgba(73,57,36,.24)');
  context.fillStyle = damp;
  context.fillRect(0, 0, width, height);
  // Irregular water marks collect at the lower edge, mostly in the margins.
  for (let i = 0; i < 34; i += 1) {
    const x = random() * width;
    const y = height * (.94 + random() * .08);
    const radius = width * (.009 + random() * .028);
    const stain = context.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, `rgba(95,69,38,${.04 + random() * .10})`);
    stain.addColorStop(1, 'rgba(95,69,38,0)');
    context.fillStyle = stain;
    context.fillRect(x-radius, y-radius, radius*2, radius*2);
  }
  // A few short folds at the corners, not repeating stripes through the text.
  for (const [ax, ay, bx, by] of [[.022,.86,.10,.73], [.90,.035,.974,.13], [.88,.92,.96,.88]]) {
    context.beginPath();
    context.moveTo(ax*width, ay*height);
    context.lineTo(bx*width, by*height);
    context.strokeStyle = 'rgba(80,65,45,.16)';
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.moveTo(ax*width+2, ay*height);
    context.lineTo(bx*width+2, by*height);
    context.strokeStyle = 'rgba(255,255,255,.5)';
    context.lineWidth = 1;
    context.stroke();
  }
}
