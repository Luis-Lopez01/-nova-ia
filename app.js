// En desarrollo local, si frontend y backend están en el mismo ordenador,
// el backend se sirve en localhost. Cambia esta dirección por tu dominio HTTPS
// Servidor de NOVA IA en Cloudflare
const API_BASE = "https://nova-ia-api.luislopez4052001.workers.dev";
let history = [];
let mode = "general";
const $ = (id) => document.getElementById(id);
const promptBox = $("prompt");
const messages = $("messages");
const welcome = $("welcome");
const sendButton = $("send");

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function addMessage(role, content, isError=false) {
  welcome.classList.add("hidden");
  const row = document.createElement("div");
  row.className = `message ${role}`;
  if (role === "assistant") {
    row.innerHTML = `<div class="avatar">✦</div><div class="bubble ${isError ? "error" : ""}">${escapeHTML(content)}<button class="speak" type="button">▶ Escuchar respuesta</button></div>`;
    row.querySelector(".speak").addEventListener("click", () => speak(content));
  } else {
    row.innerHTML = `<div class="bubble">${escapeHTML(content)}</div>`;
  }
  messages.appendChild(row);
  row.scrollIntoView({behavior:"smooth", block:"end"});
  return row;
}
function speak(text) {
  if (!("speechSynthesis" in window)) {
    alert("La lectura en voz alta no está disponible en este navegador.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-HN";
  window.speechSynthesis.speak(utterance);
}
async function sendMessage(text) {
  const clean = text.trim();
  if (!clean) return;
  addMessage("user", clean);
  history.push({role:"user", content:clean});
  promptBox.value = "";
  promptBox.style.height = "auto";
  sendButton.disabled = true;
  const loading = document.createElement("div");
  loading.className = "typing";
  loading.textContent = "NOVA está pensando…";
  messages.appendChild(loading);
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:history, mode})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "No se pudo contactar con el servidor.");
    history.push({role:"assistant", content:data.reply});
    addMessage("assistant", data.reply);
  } catch (err) {
    addMessage("assistant", `No pude conectarme con tu modelo. ${err.message}\n\nComprueba que el backend y el servidor del modelo estén encendidos.`, true);
  } finally {
    loading.remove();
    sendButton.disabled = false;
    promptBox.focus();
  }
}
$("composer").addEventListener("submit", e => { e.preventDefault(); sendMessage(promptBox.value); });
promptBox.addEventListener("input", () => { promptBox.style.height="auto"; promptBox.style.height=Math.min(promptBox.scrollHeight,180)+"px"; });
promptBox.addEventListener("keydown", e => { if(e.key==="Enter" && !e.shiftKey){e.preventDefault();sendMessage(promptBox.value);} });
$("new-chat").addEventListener("click", () => {history=[];messages.innerHTML="";welcome.classList.remove("hidden");document.querySelector(".sidebar").classList.remove("open");});
document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => {
  mode=btn.dataset.mode;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b===btn));
  document.querySelector(".sidebar").classList.remove("open");
}));
document.querySelectorAll(".suggestion").forEach(btn => btn.addEventListener("click", () => sendMessage(btn.dataset.prompt)));
$("menu-toggle").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("open"));
$("voice-input").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert("El dictado no está disponible en este navegador. Puedes escribir tu mensaje."); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = "es-HN";
  recognition.interimResults = false;
  recognition.onresult = e => { promptBox.value += (promptBox.value ? " " : "") + e.results[0][0].transcript; promptBox.focus(); };
  recognition.onerror = () => alert("No se pudo usar el micrófono. Revisa los permisos del navegador.");
  recognition.start();
});
