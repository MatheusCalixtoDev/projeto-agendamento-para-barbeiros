
const ADMIN_PASSWORD = 'admin123';

const loginForm = document.getElementById('loginForm');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const bookingTable = document.getElementById('bookingTable');
const filterDate = document.getElementById('filterDate');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = document.getElementById('password').value;
  if(pwd === ADMIN_PASSWORD){
    loginSection.style.display='none';
    dashboardSection.style.display='block';
    fetchBookings();
  } else {
    alert('Senha incorreta!');
  }
});

filterDate.addEventListener('change', ()=>fetchBookings());

async function fetchBookings(){
  const date = filterDate.value;
  let url = '/api/all-bookings';
  if(date) url += '?date=' + date;
  const res = await fetch(url);
  const data = await res.json();
  bookingTable.innerHTML='';
  data.bookings.forEach(b=>{
    const tr = document.createElement('tr');
    tr.innerHTML=`
      <td>${b.id}</td>
      <td>${b.date}</td>
      <td>${b.time}</td>
      <td>${b.name}</td>
      <td>${b.phone}</td>
      <td><button data-id="${b.id}" class="cancelBtn">Cancelar</button></td>
    `;
    bookingTable.appendChild(tr);
  });

  $$('.cancelBtn').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(confirm('Cancelar este agendamento?')){
        const id = btn.dataset.id;
        const r = await fetch('/api/booking/' + id, {method:'DELETE'});
        const res = await r.json();
        alert(res.message);
        fetchBookings();
      }
    });
  });
}

function $$(sel){ return Array.from(document.querySelectorAll(sel)); }
