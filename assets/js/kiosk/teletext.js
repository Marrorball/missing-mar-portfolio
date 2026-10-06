// What the TV inside shows when it comes on by itself: Teletext page 100
// with the channel list, the same page the guide opens up close.

const MONO = '"PT Mono", "Courier New", monospace';

export function drawTeletext(context, width, height, rows = []) {
  const u = width / 100;
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);
  context.textBaseline = 'middle';
  context.textAlign = 'left';

  context.font = `400 ${3.6 * u}px ${MONO}`;
  context.fillStyle = '#fff';
  context.fillText('P100', 3 * u, 5 * u);
  context.fillStyle = '#ffff00';
  context.fillText('ТЕЛЕТЕКСТ', 15 * u, 5 * u);
  context.fillStyle = '#00ffff';
  context.fillText('ДИЗАЙН У МАРА', 39 * u, 5 * u);

  context.fillStyle = '#0000c8';
  context.fillRect(3 * u, 9 * u, 94 * u, 10 * u);
  context.fillStyle = '#ffff00';
  context.font = `400 ${7 * u}px ${MONO}`;
  context.fillText('ТЕЛЕПРОГРАММА', 5 * u, 14.2 * u, 90 * u);

  context.font = `400 ${4.2 * u}px ${MONO}`;
  rows.slice(0, 7).forEach((row, index) => {
    const y = (26 + index * 6.4) * u;
    context.fillStyle = '#ffff00';
    context.fillText(row.number, 4 * u, y);
    context.fillStyle = '#fff';
    context.fillText(row.title.toUpperCase(), 13 * u, y, 82 * u);
  });

  const keys = [['#ff2a2a', '#000'], ['#00d200', '#000'], ['#ffff00', '#000'], ['#2a50ff', '#fff']];
  keys.forEach(([fill], index) => {
    context.fillStyle = fill;
    context.fillRect((3 + index * 23.75) * u, 68 * u, 22.75 * u, 5 * u);
  });
}
