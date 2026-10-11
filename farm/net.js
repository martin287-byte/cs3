// Peer-to-peer link over WebRTC. There is no server: the two players swap a short text code (host -> friend, friend -> host).
// A code is a compressed, base64url-encoded session description.
const ICE = [{ urls: "stun:stun.l.google.com:19302" }];

const b64 = bytes => { let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const unb64 = t => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function pipe(bytes, stream) { const r = new Response(new Blob([bytes]).stream().pipeThrough(stream)); return new Uint8Array(await r.arrayBuffer()); }
export async function encodeCode(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  try { if (typeof CompressionStream !== "undefined") return "Z" + b64(await pipe(raw, new CompressionStream("deflate-raw"))); } catch {}
  return "R" + b64(raw);
}
export async function decodeCode(text) {
  const t = text.replace(/\s+/g, ""); if (t.length < 20) throw new Error("code too short");
  const bytes = unb64(t.slice(1));
  const raw = t[0] === "Z" ? await pipe(bytes, new DecompressionStream("deflate-raw")) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}

export function createNet() {
  let pc = null, ch = null;
  const net = { status: "idle", onopen: null, onmessage: null, onclose: null, role: null };
  const setStatus = s => { net.status = s; };
  function wire(c) {
    ch = c;
    c.onopen = () => { setStatus("open"); net.onopen?.(); };
    c.onclose = () => { if (net.status !== "idle") { setStatus("closed"); net.onclose?.(); } };
    c.onmessage = e => { try { net.onmessage?.(JSON.parse(e.data)); } catch {} };
  }
  async function gathered() {
    if (pc.iceGatheringState === "complete") return;
    await new Promise(res => {
      const t = setTimeout(res, 4000);                                                   // give up waiting for more candidates after 4 s
      pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
    });
  }
  function make() {
    net.close();
    pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onconnectionstatechange = () => { if (["failed", "disconnected", "closed"].includes(pc.connectionState) && net.status === "open") { setStatus("closed"); net.onclose?.(); } };
  }
  net.host = async () => { make(); net.transport = "p2p"; net.role = "host"; setStatus("hosting"); wire(pc.createDataChannel("tv", { ordered: true })); await pc.setLocalDescription(await pc.createOffer()); await gathered(); return encodeCode(pc.localDescription.toJSON()); };
  net.accept = async code => { if (!pc || net.role !== "host") throw new Error("not hosting"); await pc.setRemoteDescription(await decodeCode(code)); setStatus("connecting"); };
  net.join = async code => { const offer = await decodeCode(code); make(); net.role = "guest"; setStatus("joining"); pc.ondatachannel = e => wire(e.channel); await pc.setRemoteDescription(offer); await pc.setLocalDescription(await pc.createAnswer()); await gathered(); return encodeCode(pc.localDescription.toJSON()); };
  // ---- relay transport: both players connect to a Tiny Valley server and meet in a 4-letter room ----
  let ws = null;
  function relay(url, first) {
    net.close(); setStatus("connecting"); net.transport = "relay"; net.error = "";
    return new Promise((resolve, reject) => {
      let sock; try { sock = new WebSocket(url); } catch (e) { setStatus("idle"); return reject(new Error("bad server address")); }
      ws = sock; let settled = false;
      const fail = msg => { if (!settled) { settled = true; setStatus("idle"); reject(new Error(msg)); } };
      sock.onopen = () => sock.send(JSON.stringify(first));
      sock.onerror = () => { fail("could not reach the server"); };
      sock.onclose = () => { if (!settled) fail("connection closed"); else if (net.status === "open") { setStatus("closed"); net.onclose?.(); } };
      sock.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch { return; }
        if (m.t === "srv:hosted") { settled = true; setStatus("hosting"); net.room = m.code; resolve(m.code); }
        else if (m.t === "srv:joined") { settled = true; setStatus("open"); net.onopen?.(); resolve(); }
        else if (m.t === "srv:peer") { setStatus("open"); net.onopen?.(); }
        else if (m.t === "srv:error") { net.error = m.msg; fail(m.msg); try { sock.close(); } catch {} }
        else if (m.t === "srv:peerleft") { if (net.status === "open") { setStatus("closed"); net.onclose?.(); } }
        else if (!String(m.t).startsWith("srv:")) net.onmessage?.(m);
      };
    });
  }
  net.relayHost = url => { net.role = "host"; return relay(url, { t: "srv:host" }); };
  net.relayJoin = (url, code) => { net.role = "guest"; return relay(url, { t: "srv:join", code }); };
  net.send = obj => {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
    else if (ch && ch.readyState === "open") ch.send(JSON.stringify(obj));
  };
  net.close = () => { const had = pc, sock = ws; setStatus("idle"); net.transport = null; net.room = ""; try { ch?.close(); } catch {} try { had?.close(); } catch {} try { if (sock) { sock.onclose = null; sock.close(); } } catch {} pc = ch = ws = null; };
  return net;
}
