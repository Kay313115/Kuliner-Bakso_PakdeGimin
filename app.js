// app.js FINAL - QRIS + SINKRON + ONGKIR TIER TANPA MAX
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvciljW20Y6Y6SlCPPd4gC7O6TyASLNCo",
  authDomain: "bakso-pakdegimin.firebaseapp.com",
  projectId: "bakso-pakdegimin",
  storageBucket: "bakso-pakdegimin.firebasestorage.app",
  messagingSenderId: "1098318717596",
  appId: "1:1098318717596:web:6bf596425e606bb27f4359"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let cart = [];
let ongkir = 0;
let zona = "Pilih Lokasi";
let metodeBayar = "COD";
let buktiBase64 = "";
let NOMOR_WARUNG_LU = "6281213660024";
const menuData = { 20000: { name: "Bakso Biasa", price: 20000 }, 26000: { name: "Bakso Mercon", price: 26000 } };

const WARUNG_LAT = -6.186; 
const WARUNG_LNG = 107.012;

function sanitize(str, max){
  if(!str) return '';
  let s = String(str).slice(0, max);
  s = s.replace(/</g,'').replace(/>/g,'').replace(/"/g,'').replace(/'/g,'').replace(/`/g,'').replace(/on\w+\s*=/gi,'');
  return s.trim();
}

window.metodeBayarGlobal = "COD";
function add(harga){
  let ex = cart.find(c=>c.price===harga);
  if(ex) ex.qty++; else cart.push({...menuData[harga], qty:1});
  updateQtyButton(harga); updateUI();
}
function ubahQty(harga, delta){
  let ex = cart.find(c=>c.price===harga); if(!ex) return;
  ex.qty += delta;
  if(ex.qty <= 0){
    cart = cart.filter(c=>c.price!==harga);
    let b = document.querySelector(`.btn-tambah[data-harga="${harga}"]`);
    let q = document.querySelector(`.qty-control[data-harga="${harga}"]`);
    if(b) b.style.display='block'; if(q) q.style.display='none';
  } else updateQtyButton(harga);
  updateUI();
}
function updateQtyButton(harga){
  let ex = cart.find(c=>c.price===harga); if(!ex) return;
  let b = document.querySelector(`.btn-tambah[data-harga="${harga}"]`);
  let q = document.querySelector(`.qty-control[data-harga="${harga}"]`);
  if(b) b.style.display='none';
  if(q){ q.style.display='flex'; q.querySelector('.qty-num').textContent = ex.qty; }
}
function updateUI(){
  const sub = cart.reduce((s,i)=>s+(i.price*i.qty),0);
  const grand = sub + ongkir;
  const cnt = cart.reduce((s,i)=>s+i.qty,0);
  document.getElementById('badge').textContent = cnt;
  if(cart.length===0){
    document.getElementById('empty-state').style.display='block';
    document.getElementById('filled-state').style.display='none'; return;
  }
  document.getElementById('empty-state').style.display='none';
  document.getElementById('filled-state').style.display='block';
  let list = document.getElementById('ringkasan-list');
  list.innerHTML = '';
  cart.forEach(c=>{
    let row = document.createElement('div'); row.className='row';
    let s = document.createElement('span'); s.textContent = `${c.name} x${c.qty}`;
    let b = document.createElement('b'); b.textContent = `Rp${(c.price*c.qty).toLocaleString('id-ID')}`;
    row.append(s,b); list.appendChild(row);
  });
  document.getElementById('subtotal').textContent = 'Rp'+sub.toLocaleString('id-ID');
  document.getElementById('ongkir').textContent = 'Rp'+ongkir.toLocaleString('id-ID');
  document.getElementById('total').textContent = 'Rp'+grand.toLocaleString('id-ID');
  document.getElementById('btn-total').textContent = 'Rp'+grand.toLocaleString('id-ID');
  document.getElementById('zona-text').textContent = zona;
  if(metodeBayar==='QRIS'){
    let el = document.getElementById('qrisTotal');
    if(el) el.textContent = `Total Bayar: Rp${grand.toLocaleString('id-ID')} - Scan & Bayar`;
  }
}
function hitungJarak(lat1, lng1, lat2, lng2){
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI / 180;
  const dLng = (lng2-lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
function getLocation(){
  let jarakEl = document.getElementById('jarak');
  if(!jarakEl) return;
  jarakEl.textContent = '📍 Mencari lokasi...';
  jarakEl.style.color = '#666';
  if(!navigator.geolocation){
    jarakEl.textContent = '❌ GPS gak support - pakai default 3000';
    ongkir = 3000; zona = "Dekat (2.0KM)"; updateUI(); return;
  }
  navigator.geolocation.getCurrentPosition((pos)=>{
    let jarak = hitungJarak(WARUNG_LAT, WARUNG_LNG, pos.coords.latitude, pos.coords.longitude);
    if(jarak <= 2.0){
      ongkir = 3000; zona = `Dekat (${jarak.toFixed(1)}KM)`;
    } else if(jarak <= 5.0){
      ongkir = 5000; zona = `Sedang (${jarak.toFixed(1)}KM)`;
    } else if(jarak <= 7.0){
      ongkir = 7000; zona = `Jauh (${jarak.toFixed(1)}KM)`;
    } else {
      ongkir = 10000; zona = `Sangat Jauh (${jarak.toFixed(1)}KM)`;
    }
    jarakEl.innerHTML = `📍 Jarak ${jarak.toFixed(1)}KM → <b style="color:#16A34A">${zona} Rp${ongkir.toLocaleString('id-ID')}</b>`;
    jarakEl.style.color = '#16A34A';
    updateUI();
  }, (err)=>{
    jarakEl.textContent = '❌ Gagal ambil lokasi - pakai default 3000';
    ongkir = 3000; zona = "Dekat (2.0KM)"; updateUI();
  }, { enableHighAccuracy: true, timeout: 10000 });
}
async function buatPesanan(){
  let nama = sanitize(document.getElementById('nama').value, 50);
  let wa = document.getElementById('wa').value.replace(/[^0-9]/g,'').slice(0,15);
  let alamat = sanitize(document.getElementById('alamat').value, 200);
  let metodeAktif = window.metodeBayarGlobal || metodeBayar;
  if(cart.length===0){ alert('Pilih menu dulu Jan!'); return; }
  if(!nama||!wa||!alamat){ alert('Isi Nama, WA, Alamat dulu!'); return; }
  if(ongkir===0){ alert('Klik Gunakan Lokasi Saya dulu!'); return; }
  if(metodeAktif === 'QRIS' && !buktiBase64){
    alert('QRIS wajib upload bukti bayar dulu ya kak! 📸');
    document.getElementById('qrisBox').scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  let data = { cart, subtotal: cart.reduce((s,i)=>s+(i.price*i.qty),0), ongkir, total: cart.reduce((s,i)=>s+(i.price*i.qty),0)+ongkir, nama, wa, alamat, zona, metode: metodeAktif, buktiBayar: buktiBase64 || "", status: 'menunggu', waktu: serverTimestamp() };
  try{
    const docRef = await addDoc(collection(db, "pesanan"), data);
    const idBaru = docRef.id;
    localStorage.setItem('pesanan_'+idBaru, JSON.stringify({...data, id:idBaru, waktu: new Date().toISOString()}));
    localStorage.setItem('last_id', idBaru);
    showTracking(idBaru);
    history.pushState({},'', '?id='+idBaru);
    onSnapshot(doc(db, "pesanan", idBaru), (snap)=>{ if(snap.exists()) renderTrackData({id:snap.id, ...snap.data()}); });
    setTimeout(()=>{
      let pesan = `🔥 PESANAN BARU #${idBaru.slice(0,5)}\nNama: ${nama}\nWA: ${wa}\nAlamat: ${alamat}\nTotal: Rp${data.total.toLocaleString('id-ID')}\nMetode: ${metodeAktif}`;
      window.open(`https://wa.me/${NOMOR_WARUNG_LU}?text=${encodeURIComponent(pesan)}`, '_blank');
    }, 800);
  }catch(e){ alert("Gagal: "+e.message); }
}
function showTracking(id){
  document.getElementById('menu-view').style.display='none';
  document.getElementById('track-view').style.display='block';
  document.getElementById('id-pesanan').textContent = 'ID: '+id.slice(0,6);
  document.getElementById('track-id').textContent = id.slice(0,6);
  document.getElementById('track-nama').textContent = 'Memuat...';
  document.getElementById('track-alamat').textContent = 'Memuat...';
  try{ let raw = localStorage.getItem('pesanan_'+id); if(raw){ let d = JSON.parse(raw); renderTrackData(d); } }catch(e){}
  onSnapshot(doc(db, "pesanan", id), (snap)=>{ if(snap.exists()){ let d = {id:snap.id, ...snap.data()}; renderTrackData(d); } });
}
function renderTrackData(data){
  document.getElementById('track-nama').textContent = data.nama || '-';
  document.getElementById('track-alamat').textContent = data.alamat || '-';
  document.getElementById('track-total').textContent = 'Rp'+Number(data.total||0).toLocaleString('id-ID');
  let list = document.getElementById('track-list');
  if(!list) return;
  list.innerHTML = '';
  (data.cart||[]).forEach(c=>{
    let row = document.createElement('div'); row.className='row';
    let s = document.createElement('span'); s.textContent = `${c.name} x${c.qty}`;
    let b = document.createElement('b'); b.textContent = `Rp${(c.price*c.qty).toLocaleString('id-ID')}`;
    row.append(s,b); list.appendChild(row);
  });
  updateStep(data.status);
}
function updateStep(status){
  if(!status) status = 'menunggu';
  status = String(status).toLowerCase().trim();
  let current = 0;
  if(status === 'menunggu' || status.includes('tunggu') || status.includes('terima') || status === 'diterima') current = 0;
  else if(status === 'disiapkan' || status === 'diproses' || status === 'dimasak' || status.includes('proses') || status.includes('siap') || status.includes('masak')) current = 1;
  else if(status === 'diantar' || status === 'kurir' || status.includes('antar') || status.includes('kurir')) current = 2;
  else if(status === 'selesai' || status.includes('selesai') || status.includes('sampai')) current = 3;
  for(let i=0;i<4;i++){
    let el = document.getElementById('step-'+i);
    if(!el) continue;
    let dot = el.querySelector('.dot');
    let line = el.querySelector('.line');
    el.classList.remove('done','active');
    if(dot){ dot.className='dot todo'; dot.textContent='○'; }
    if(line) line.classList.remove('done');
    if(i < current){ el.classList.add('done'); if(dot){ dot.className='dot done'; dot.textContent='✓'; } if(line) line.classList.add('done'); }
    else if(i === current){ el.classList.add('active'); if(dot){ dot.className='dot active'; dot.textContent='●'; } }
  }
}
function kembaliKeMenu(){ history.pushState({},'','index.html'); document.getElementById('track-view').style.display='none'; document.getElementById('menu-view').style.display='block'; cart=[]; ongkir=0; zona="Pilih Lokasi"; buktiBase64=""; metodeBayar="COD"; window.metodeBayarGlobal="COD"; document.getElementById('jarak').textContent=''; document.querySelectorAll('.btn-tambah').forEach(b=>{b.style.display='block'}); document.querySelectorAll('.qty-control').forEach(b=>{b.style.display='none'}); let qrisBox=document.getElementById('qrisBox'); if(qrisBox) qrisBox.style.display='none'; document.querySelectorAll('.pay').forEach(x=>x.classList.remove('active')); let payCOD=document.getElementById('payCOD'); if(payCOD) payCOD.classList.add('active'); updateUI(); renderBannerPesanan(); }
function renderBannerPesanan(){ let banner = document.getElementById('banner-pesanan'); if(!banner) return; let lastId = localStorage.getItem('last_id'); if(!lastId){ banner.style.display='none'; return; } banner.style.display='flex'; document.getElementById('banner-id').textContent = 'Pesanan #'+lastId.slice(0,5); }
function bukaPesananTerakhir(){ let lastId = localStorage.getItem('last_id'); if(!lastId) return; showTracking(lastId); history.pushState({},'', '?id='+lastId); }
window.ubahQty = ubahQty; window.kembaliKeMenu = kembaliKeMenu; window.bukaPesananTerakhir = bukaPesananTerakhir;
window.setMetode = function(m){ metodeBayar = m; window.metodeBayarGlobal = m; document.querySelectorAll('.pay').forEach(x=>x.classList.remove('active')); let cod = document.getElementById('payCOD'); let qris = document.getElementById('payQRIS'); let box = document.getElementById('qrisBox'); if(m === 'COD'){ if(cod) cod.classList.add('active'); if(box) box.style.display = 'none'; } else { if(qris) qris.classList.add('active'); if(box){ box.style.display = 'block'; let total = cart.reduce((s,i)=>s+(i.price*i.qty),0)+ongkir; let qrisTotal=document.getElementById('qrisTotal'); if(qrisTotal) qrisTotal.textContent = `Total Bayar: Rp${total.toLocaleString('id-ID')} - Scan & Bayar`; setTimeout(()=>{ box.scrollIntoView({behavior:'smooth', block:'center'}); },100); } } }
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id) { showTracking(id); return; }
  document.querySelectorAll('.btn-tambah').forEach(btn => { btn.addEventListener('click', (e)=>{ e.preventDefault(); add(parseInt(btn.dataset.harga)); }); });
  document.getElementById('payCOD')?.addEventListener('click', ()=>{ window.setMetode('COD'); });
  document.getElementById('payQRIS')?.addEventListener('click', ()=>{ window.setMetode('QRIS'); });
  document.querySelectorAll('.pay').forEach(p => { p.addEventListener('click', function(){ let m = this.dataset.pay; if(m) window.setMetode(m); }); });
  document.getElementById('buktiFile')?.addEventListener('change', (e)=>{
    let file = e.target.files[0]; if(!file) return;
    if(file.size > 2*1024*1024){ alert('Foto max 2MB ya kak!'); e.target.value=''; return; }
    let reader = new FileReader();
    reader.onload = (ev)=>{ buktiBase64 = ev.target.result; let prev = document.getElementById('previewBukti'); if(prev){ prev.src = buktiBase64; prev.style.display = 'block'; } let status = document.getElementById('buktiStatus'); if(status) status.style.display = 'block'; };
    reader.readAsDataURL(file);
  });
  document.getElementById('btnLokasi')?.addEventListener('click', getLocation);
  let btnLokasiClass = document.querySelector('.btn-lokasi'); if(btnLokasiClass) btnLokasiClass.addEventListener('click', getLocation);
  document.getElementById('btn-buat-pesanan')?.addEventListener('click', buatPesanan);
  setTimeout(renderBannerPesanan, 300);
});
