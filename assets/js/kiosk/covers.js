// Only existing local artwork is loaded into the scene. Authored logos and
// case images retain their aspect ratio; no generated replacements.
function localImage(value = '') {
  const path = String(value);
  if (path.includes('..') || /[\\?#]/.test(path)) return '';
  return /^\/missing-mar-portfolio\/assets\/media\/[\w/ .%А-Яа-яЁё-]+\.(png|jpe?g|webp|svg)$/i.test(path) ? path : '';
}

export function coverDescriptor(project = {}, categories = []) {
  const firstImage = (project.sections || [])
    .map(section => /<img\b[^>]*\bsrc=["']([^"']+)["']/i.exec(section.content || '')?.[1])
    .find(path => localImage(path));
  return {
    title: project.shortLabel || project.title || 'Проект',
    year: String(project.year || ''),
    category: categories.find(category => category.id === project.category)?.title || 'Дизайн',
    accent: /^#[\da-f]{6}$/i.test(project.accent || '') ? project.accent : '#c98a49',
    image: localImage(project.cover) || localImage(firstImage)
  };
}

export function drawCover(context, width, height, descriptor, artwork = null) {
  const { title, category, year, accent } = descriptor;
  context.fillStyle = '#e8dfc9';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#222521';
  context.fillRect(0, 0, width, height * 0.08);
  context.fillStyle = '#e8dfc9';
  context.font = `600 ${width * 0.047}px "IBM Plex Mono", monospace`;
  context.fillText('missing mar  /  DVD', width * 0.08, height * 0.052);
  const top = height * 0.10;
  const artHeight = height * 0.56;
  context.fillStyle = artwork ? '#fbfaf6' : accent;
  context.fillRect(width * 0.07, top, width * 0.86, artHeight);
  if (artwork) {
    const scale = Math.min(width * 0.78 / artwork.naturalWidth, artHeight * 0.86 / artwork.naturalHeight);
    const w = artwork.naturalWidth * scale;
    const h = artwork.naturalHeight * scale;
    context.drawImage(artwork, (width - w) / 2, top + (artHeight - h) / 2, w, h);
  } else {
    context.strokeStyle = '#222521';
    context.lineWidth = width * 0.013;
    context.beginPath();
    context.arc(width / 2, top + artHeight / 2, width * 0.25, 0, Math.PI * 2);
    context.arc(width / 2, top + artHeight / 2, width * 0.045, 0, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = '#222521';
  context.textBaseline = 'top';
  context.font = `700 ${width * 0.083}px "IBM Plex Mono", monospace`;
  const words = title.split(/\s+/);
  let line = '';
  let y = height * 0.70;
  for (const word of words) {
    if (line && context.measureText(`${line} ${word}`).width > width * 0.84) {
      context.fillText(line, width * 0.08, y, width * 0.84);
      y += height * 0.062;
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  context.fillText(line, width * 0.08, y, width * 0.84);
  context.font = `500 ${width * 0.046}px "IBM Plex Mono", monospace`;
  context.fillText(`${category}  /  ${year}`, width * 0.08, height * 0.91, width * 0.84);
  context.textBaseline = 'alphabetic';
}
