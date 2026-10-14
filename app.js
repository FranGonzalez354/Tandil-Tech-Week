'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const homePage = $('#home-page');
const registrationPage = $('#registration-page');
const dialog = $('#event-dialog');
const weekVideo = $('#week-video');
const hackingVideo = $('#hacking-video');
let gameCompleted = false;
let gameInitialized = false;
let registrationSaved = false;
let gameCompletionTimer;
let weekManuallyPaused = false;
let weekInView = false;
let scrollContext;

const events = {
  hacking: {
    title: 'Hacking Day',
    date: '14 de octubre',
    description: 'Jornada de hacking en equipos. Juntá a tus amigos y vení a divertirte aprendiendo de ciberseguridad.',
    location: 'Campus Universitario UNICEN, Tandil, Buenos Aires.',
    map: 'Campus Universitario UNICEN Tandil',
    image: 'hackaton_day_click.png',
    imageAlt: 'Participantes de Hacking Day en un aula del Campus UNICEN',
  },
  startup: {
    title: 'Startup Day',
    date: '15 de octubre',
    description: 'Vení a conocer a los que hacen. Charlas dinámicas y networking entre fundadores, venture capital y estudiantes.',
    location: 'Distrito Avellaneda. Av. Avellaneda 1140, B7000 Tandil, Buenos Aires, Argentina.',
    map: 'Distrito Avellaneda Av. Avellaneda 1140 Tandil Buenos Aires Argentina',
    image: 'distrito_avellaneda_click.jpg',
    imageAlt: 'Entrada del cowork de Distrito Avellaneda',
  },
};

// Theme persists locally; the site also works when storage is unavailable.
const themeToggle = $('.theme-toggle');
function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', dark ? 'Activar modo claro' : 'Activar modo oscuro');
}
themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('ttw-theme', theme); } catch { /* Theme still works without persistence. */ }
  updateThemeButton();
});
updateThemeButton();

// Duplicate only the visual sponsor strip, keeping one accessible list.
const sponsorTrack = $('.sponsor-track');
const sponsorCopy = $('.sponsor-set').cloneNode(true);
sponsorCopy.setAttribute('aria-hidden', 'true');
sponsorCopy.removeAttribute('aria-label');
$$('a', sponsorCopy).forEach((link) => { link.tabIndex = -1; });
sponsorTrack.append(sponsorCopy);
$('#sponsor-pause').addEventListener('click', (event) => {
  const paused = sponsorTrack.classList.toggle('is-paused');
  event.currentTarget.setAttribute('aria-pressed', String(paused));
  event.currentTarget.innerHTML = paused ? 'Reanudar movimiento <span aria-hidden="true">▷</span>' : 'Pausar movimiento <span aria-hidden="true">Ⅱ</span>';
});

// Native scrolling supports touch and trackpads; controls snap to each artwork.
const speakersTrack = $('#speakers-track');
const speakerSlides = $$('.speaker-slide', speakersTrack);
const speakersPrev = $('#speakers-prev');
const speakersNext = $('#speakers-next');
function updateSpeakers() {
  if (!speakersTrack.clientWidth) return;
  const maxScroll = speakersTrack.scrollWidth - speakersTrack.clientWidth;
  speakersPrev.disabled = speakersTrack.scrollLeft <= 2;
  speakersNext.disabled = speakersTrack.scrollLeft >= maxScroll - 2;
  const bounds = speakersTrack.getBoundingClientRect();
  const visible = speakerSlides.map((slide, index) => ({ rect: slide.getBoundingClientRect(), index }))
    .filter(({ rect }) => rect.left >= bounds.left - 2 && rect.right <= bounds.right + 2);
  if (visible.length) {
    const first = visible[0].index + 1;
    const last = visible[visible.length - 1].index + 1;
    $('#speakers-status').textContent = `${first === last ? first : `${first}–${last}`} de ${speakerSlides.length}`;
  }
}
function moveSpeakers(direction) {
  const step = speakerSlides[1].offsetLeft - speakerSlides[0].offsetLeft;
  const index = direction > 0 ? Math.floor((speakersTrack.scrollLeft + 2) / step) + 1 : Math.ceil((speakersTrack.scrollLeft - 2) / step) - 1;
  speakersTrack.scrollTo({ left: Math.max(0, index * step), behavior: motionPreference.matches ? 'instant' : 'smooth' });
}
speakersPrev.addEventListener('click', () => moveSpeakers(-1));
speakersNext.addEventListener('click', () => moveSpeakers(1));
speakersTrack.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') moveSpeakers(event.key === 'ArrowRight' ? 1 : -1);
  else speakersTrack.scrollTo({ left: event.key === 'Home' ? 0 : speakersTrack.scrollWidth, behavior: motionPreference.matches ? 'instant' : 'smooth' });
});
let speakersScrollTimer;
speakersTrack.addEventListener('scroll', () => {
  clearTimeout(speakersScrollTimer);
  speakersScrollTimer = setTimeout(updateSpeakers, 120);
}, { passive: true });
new ResizeObserver(updateSpeakers).observe(speakersTrack);
updateSpeakers();

function playQuietly(video) {
  const result = video.play();
  if (result) result.catch(() => { /* A play control is available if autoplay is blocked. */ });
}

function syncWeekPlayback() {
  if (weekInView && !homePage.hidden && !document.hidden && !dialog.open && !motionPreference.matches && !weekManuallyPaused) playQuietly(weekVideo);
  else weekVideo.pause();
}
const videoObserver = new IntersectionObserver((entries) => {
  weekInView = entries[0].isIntersecting;
  syncWeekPlayback();
}, { threshold: 0.15 });
videoObserver.observe(weekVideo);

$('.video-play').addEventListener('click', () => {
  weekManuallyPaused = !weekVideo.paused;
  if (weekVideo.paused) playQuietly(weekVideo);
  else weekVideo.pause();
});
function updatePlayControl() {
  const paused = weekVideo.paused;
  $('.video-play').setAttribute('aria-label', paused ? 'Reproducir video' : 'Pausar video');
  $('.video-play').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${paused ? '<path d="m8 5 11 7-11 7V5Z"/>' : '<path d="M9 6v12M15 6v12"/>'}</svg>`;
}
weekVideo.addEventListener('play', updatePlayControl);
weekVideo.addEventListener('pause', updatePlayControl);
updatePlayControl();
$('.video-sound').addEventListener('click', (event) => {
  weekVideo.muted = !weekVideo.muted;
  event.currentTarget.setAttribute('aria-pressed', String(!weekVideo.muted));
  event.currentTarget.innerHTML = `${weekVideo.muted ? 'Activar sonido' : 'Silenciar'} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="${weekVideo.muted ? 'm16 9 5 6m0-6-5 6' : 'M15 8q5 4 0 8m3-11q8 7 0 14'}"/></svg>`;
});

// Slow–fast–slow panel expansion, with keyboard focus offering the same state.
const panels = $('.event-panels');
function activatePanel(key) {
  panels.dataset.active = key;
  $$('.event-panel').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.event === key));
  if (key === 'hacking' && !motionPreference.matches && !dialog.open && !document.hidden) playQuietly(hackingVideo);
  else hackingVideo.pause();
}
$$('.event-panel').forEach((panel) => {
  panel.addEventListener('pointerenter', (event) => { if (event.pointerType !== 'touch') activatePanel(panel.dataset.event); });
  panel.addEventListener('focus', () => activatePanel(panel.dataset.event));
  panel.addEventListener('click', () => openEvent(panel.dataset.event));
});
panels.addEventListener('pointerleave', () => activatePanel(''));
panels.addEventListener('focusout', (event) => { if (!panels.contains(event.relatedTarget)) activatePanel(''); });
new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) hackingVideo.pause(); }, { threshold: 0.1 }).observe(panels);

let activeEvent = 'hacking';
function openEvent(key) {
  activeEvent = key;
  const event = events[key];
  $('#dialog-title').textContent = event.title;
  $('.dialog-date').textContent = event.date;
  $('.dialog-description').textContent = event.description;
  $('.dialog-location').textContent = event.location;
  $('.dialog-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.map)}`;
  const media = $('.dialog-media');
  media.replaceChildren();
  const image = document.createElement('img');
  image.src = event.image;
  image.alt = event.imageAlt;
  media.append(image);
  dialog.showModal();
  document.body.classList.add('modal-open');
  weekVideo.pause();
  hackingVideo.pause();
}
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  syncWeekPlayback();
});
$('.dialog-register').addEventListener('click', () => {
  if (registrationSaved) startRegistration(true);
  $$('input[name="event"]').forEach((input) => { input.checked = input.value === activeEvent; });
  dialog.close();
});

// ScrollTrigger drives the single typographic departure and video reveal.
function setupScroll() {
  scrollContext?.revert();
  scrollContext = undefined;
  window.dispatchEvent(new Event('ttw:route'));
  if (!window.gsap || !window.ScrollTrigger || homePage.hidden) return;
  gsap.registerPlugin(ScrollTrigger);
  scrollContext = gsap.matchMedia();
  scrollContext.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to('.hero-composition', {
      y: -65, opacity: 0.3, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.to('.scroll-progress', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '#home-page', start: 'top top', end: 'bottom bottom', scrub: true },
    });
  });
  ScrollTrigger.refresh();
}

function renderRoute() {
  const registration = location.hash === '#inscripcion';
  homePage.hidden = registration;
  registrationPage.hidden = !registration;
  document.title = registration ? 'Inscripción | Tandil Tech Week' : 'Tandil Tech Week — 14 & 15 OCT';
  if (registration) {
    hackingVideo.pause();
    weekVideo.pause();
    if (!gameInitialized) initializeGame();
    if (registrationSaved) startRegistration(true);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (!gameCompleted) { layoutCables(); $('#game-title').focus({ preventScroll: true }); }
      else $('#form-title').focus({ preventScroll: true });
    });
  } else {
    syncWeekPlayback();
    requestAnimationFrame(() => {
      if (!location.hash || location.hash === '#inicio') window.scrollTo({ top: 0, behavior: 'instant' });
      else if (location.hash === '#proximos' && window.ttwLaptop?.scrollToEvents()) { /* Arrive at the interactive section after the zoom. */ }
      else document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
  }
  setupScroll();
}
window.addEventListener('hashchange', renderRoute);
$$('a[href="#inscripcion"]').forEach((link) => {
  link.addEventListener('click', () => {
    if (location.hash === '#inscripcion' && registrationSaved) startRegistration(true);
  });
});

// Cable game: one selected cable, six interchangeable ports, four connections.
const cableColors = ['#28ad1d', '#e38b38', '#4b8bd6', '#9c6ac4'];
const cableNames = ['verde', 'naranja', 'azul', 'violeta'];
const cables = [];
const ports = [];
const stage = $('#game-stage');
let selectedCable = null;
let drag = null;

function initializeGame() {
  gameInitialized = true;
  for (let i = 0; i < 6; i++) {
    const port = document.createElement('button');
    port.type = 'button';
    port.className = 'port';
    port.setAttribute('aria-label', `Puerto ${i + 1}, libre`);
    port.innerHTML = `<span class="port-label" aria-hidden="true">${i + 1}</span>`;
    port.addEventListener('click', () => {
      if (selectedCable !== null) connectCable(selectedCable, i);
      else announce('Primero seleccioná un cable y después un puerto libre.');
    });
    $('.switch-ports').append(port);
    ports.push({ element: port, cable: null });
  }
  for (let i = 0; i < 4; i++) {
    const plug = document.createElement('button');
    plug.type = 'button';
    plug.className = 'cable-plug';
    plug.style.setProperty('--cable-color', cableColors[i]);
    plug.setAttribute('aria-label', `Seleccionar cable ${cableNames[i]}`);
    plug.setAttribute('aria-pressed', 'false');
    // Pointer selection happens on pointerdown; detail 0 covers keyboard and assistive activation.
    plug.addEventListener('click', (event) => { if (event.detail === 0 && cables[i].port === null) selectCable(i); });
    plug.addEventListener('pointerdown', (event) => startDrag(event, i));
    $('.cables').append(plug);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('cable-path');
    path.setAttribute('stroke', cableColors[i]);
    $('#cable-svg').append(path);
    cables.push({ plug, path, port: null, x: 0, y: 0 });
  }
  new ResizeObserver(() => { if (!registrationPage.hidden && !gameCompleted) layoutCables(); }).observe(stage);
  stage.addEventListener('pointermove', moveDrag);
  stage.addEventListener('pointerup', finishDrag);
  stage.addEventListener('pointercancel', cancelDrag);
  stage.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      cancelDrag();
      selectedCable = null;
      updateSelectedCable();
      announce('Selección cancelada. Elegí otro cable.');
    }
  });
}

function announce(message) { $('#game-announcement').textContent = message; }
function resetGame() {
  clearTimeout(gameCompletionTimer);
  cancelDrag();
  gameCompleted = false;
  selectedCable = null;
  cables.forEach((cable, index) => {
    cable.port = null;
    cable.plug.disabled = false;
    cable.plug.classList.remove('is-connected', 'is-selected', 'is-dragging');
    cable.plug.setAttribute('aria-pressed', 'false');
    cable.plug.setAttribute('aria-label', `Seleccionar cable ${cableNames[index]}`);
  });
  ports.forEach((port, index) => {
    port.cable = null;
    port.element.disabled = false;
    port.element.classList.remove('occupied', 'drop-target');
    port.element.style.removeProperty('--cable-color');
    port.element.setAttribute('aria-label', `Puerto ${index + 1}, libre`);
  });
  stage.classList.remove('game-complete');
  $('.game-heading .server-status').classList.remove('connected');
  $('.game-heading .server-status').innerHTML = '<span></span> Servidor desconectado';
  $('#connection-count').textContent = '0 de 4 conexiones';
  $('#game-hint').textContent = 'Un cable. Una conexión. Ya estás más cerca.';
  announce('Conectá los cuatro cables para entrar.');
}
function startRegistration(clearForm) {
  resetGame();
  registrationSaved = false;
  if (clearForm) registrationForm.reset();
  $('#form-error').textContent = '';
  registrationForm.hidden = false;
  $('#registration-success').hidden = true;
  $('#registration-form-section').hidden = true;
  $('#connection-game').hidden = false;
  requestAnimationFrame(() => {
    if (registrationPage.hidden) return;
    layoutCables();
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#game-title').focus({ preventScroll: true });
  });
}
function selectCable(index) {
  selectedCable = index;
  updateSelectedCable();
  announce(`Cable ${cableNames[index]} seleccionado. Elegí cualquier puerto libre.`);
}
function updateSelectedCable() {
  cables.forEach((cable, index) => {
    cable.plug.classList.toggle('is-selected', index === selectedCable);
    cable.plug.setAttribute('aria-pressed', String(index === selectedCable));
  });
}
function portPosition(index) {
  const base = stage.getBoundingClientRect();
  const rect = ports[index].element.getBoundingClientRect();
  return { x: rect.left - base.left + rect.width / 2, y: rect.top - base.top + rect.height / 2 + 8 };
}
function layoutCables() {
  if (!stage.clientWidth) return;
  cables.forEach((cable, index) => {
    if (drag?.index === index) return;
    const position = cable.port === null
      ? { x: stage.clientWidth * [0.18, 0.39, 0.61, 0.82][index], y: stage.clientHeight * [0.7, 0.64, 0.72, 0.65][index] }
      : portPosition(cable.port);
    cable.x = position.x;
    cable.y = position.y;
    drawCable(index);
  });
}
function drawCable(index) {
  const cable = cables[index];
  const base = stage.getBoundingClientRect();
  const source = $(`.cable-source[data-cable="${index}"]`).getBoundingClientRect();
  const sx = source.left - base.left;
  const sy = source.top - base.top;
  const endY = cable.y + (cable.port === null ? 20 : 14);
  const bend = (index % 2 ? -1 : 1) * stage.clientWidth * 0.08;
  cable.path.setAttribute('d', `M ${sx} ${sy} C ${sx + bend} ${sy - 90}, ${cable.x + bend} ${endY + 80}, ${cable.x} ${endY}`);
  cable.plug.style.left = `${cable.x}px`;
  cable.plug.style.top = `${cable.y}px`;
}
function startDrag(event, index) {
  if (cables[index].port !== null || event.button !== 0) return;
  selectCable(index);
  drag = { index, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
  cables[index].plug.setPointerCapture(event.pointerId);
}
function availablePortAt(x, y) {
  return ports.findIndex((port) => {
    const rect = port.element.getBoundingClientRect();
    return port.cable === null && x >= rect.left - 5 && x <= rect.right + 5 && y >= rect.top - 15 && y <= rect.bottom + 15;
  });
}
function moveDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.moved = true;
  if (!drag.moved) return;
  const rect = stage.getBoundingClientRect();
  const cable = cables[drag.index];
  cable.x = Math.max(18, Math.min(rect.width - 18, event.clientX - rect.left));
  cable.y = Math.max(18, Math.min(rect.height - 25, event.clientY - rect.top));
  cable.plug.classList.add('is-dragging');
  drawCable(drag.index);
  const target = availablePortAt(event.clientX, event.clientY);
  ports.forEach((port, index) => port.element.classList.toggle('drop-target', index === target));
}
function finishDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const current = drag;
  const target = availablePortAt(event.clientX, event.clientY);
  drag = null;
  if (cables[current.index].plug.hasPointerCapture(event.pointerId)) cables[current.index].plug.releasePointerCapture(event.pointerId);
  cables[current.index].plug.classList.remove('is-dragging');
  ports.forEach((port) => port.element.classList.remove('drop-target'));
  if (current.moved) {
    if (target >= 0) connectCable(current.index, target);
    else { layoutCables(); announce('Soltá el cable sobre un puerto libre o seleccioná un puerto con un toque.'); }
  }
}
function cancelDrag() {
  if (drag) {
    const { index, pointerId } = drag;
    if (cables[index].plug.hasPointerCapture(pointerId)) cables[index].plug.releasePointerCapture(pointerId);
    cables[index].plug.classList.remove('is-dragging');
    drag = null;
  }
  ports.forEach((port) => port.element.classList.remove('drop-target'));
  layoutCables();
}
function connectCable(cableIndex, portIndex) {
  if (cables[cableIndex].port !== null || ports[portIndex].cable !== null) return;
  const cable = cables[cableIndex];
  const port = ports[portIndex];
  cable.port = portIndex;
  port.cable = cableIndex;
  cable.plug.classList.add('is-connected');
  cable.plug.disabled = true;
  cable.plug.setAttribute('aria-label', `Cable ${cableNames[cableIndex]} conectado al puerto ${portIndex + 1}`);
  port.element.classList.add('occupied');
  port.element.style.setProperty('--cable-color', cableColors[cableIndex]);
  port.element.disabled = true;
  port.element.setAttribute('aria-label', `Puerto ${portIndex + 1}, ocupado por cable ${cableNames[cableIndex]}`);
  selectedCable = null;
  updateSelectedCable();
  layoutCables();
  const count = cables.filter((item) => item.port !== null).length;
  $('#connection-count').textContent = `${count} de 4 conexiones`;
  announce(`Cable ${cableNames[cableIndex]} conectado. ${count} de 4 conexiones listas.`);
  if (count === 4) {
    gameCompleted = true;
    stage.classList.add('game-complete');
    $('.game-heading .server-status').classList.add('connected');
    $('.game-heading .server-status').innerHTML = '<span></span> Servidor conectado';
    $('#game-hint').textContent = 'Conexión restablecida. ¡Entramos!';
    announce('Servidor conectado. Ya podés completar tu inscripción.');
    gameCompletionTimer = setTimeout(showRegistrationForm, motionPreference.matches ? 0 : 850);
  } else {
    cables.find((item) => item.port === null)?.plug.focus({ preventScroll: true });
  }
}
function showRegistrationForm() {
  $('#connection-game').hidden = true;
  $('#registration-form-section').hidden = false;
  if (!registrationPage.hidden) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    $('#form-title').focus({ preventScroll: true });
  }
}

// This static version intentionally stores locally; it never claims a server booking.
const registrationForm = $('#registration-form');
registrationForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!gameCompleted) return;
  const data = new FormData(registrationForm);
  const chosenEvents = data.getAll('event');
  const error = $('#form-error');
  if (!chosenEvents.length) {
    error.textContent = 'Elegí al menos un evento para guardar tu inscripción.';
    $('input[name="event"]').focus();
    return;
  }
  const name = data.get('name').trim();
  if (!name) {
    error.textContent = 'Ingresá tu nombre y apellido.';
    $('#full-name').focus();
    return;
  }
  const registration = {
    name,
    email: data.get('email').trim(),
    organization: data.get('organization').trim(),
    events: chosenEvents,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem('ttw-registration', JSON.stringify(registration));
  } catch {
    error.textContent = 'No se pudieron guardar los datos. Habilitá el almacenamiento de este navegador y volvé a intentarlo.';
    return;
  }
  error.textContent = '';
  resetGame();
  registrationSaved = true;
  registrationForm.hidden = true;
  $('#registration-success').hidden = false;
  $('#new-registration').focus();
});
$('#edit-registration').addEventListener('click', () => {
  startRegistration(false);
});
$('#new-registration').addEventListener('click', () => startRegistration(true));
try {
  const saved = JSON.parse(localStorage.getItem('ttw-registration') || 'null');
  if (saved && typeof saved.name === 'string' && typeof saved.email === 'string') {
    $('#full-name').value = saved.name;
    $('#email').value = saved.email;
    $('#organization').value = typeof saved.organization === 'string' ? saved.organization : '';
    $$('input[name="event"]').forEach((input) => { input.checked = Array.isArray(saved.events) && saved.events.includes(input.value); });
  }
} catch { /* A fresh form is available if stored data cannot be read. */ }

document.addEventListener('visibilitychange', () => {
  syncWeekPlayback();
  if (document.hidden) hackingVideo.pause();
});
motionPreference.addEventListener('change', () => {
  syncWeekPlayback();
  if (motionPreference.matches) hackingVideo.pause();
});
if (motionPreference.matches) weekVideo.pause();
renderRoute();
document.fonts.ready.then(() => { if (!homePage.hidden) window.ScrollTrigger?.refresh(); });
window.addEventListener('load', () => window.ScrollTrigger?.refresh());
