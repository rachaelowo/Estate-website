const availabilityEl = document.getElementById("availability");

if (availabilityEl) {
  availabilityEl.textContent =
    availableRooms > 0
      ? `${availableRooms} units currently available for sale`
      : "All units are currently sold out";
}
console.log("Ennie Garden Estate website loaded");


document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.navbar nav');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }
});


  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const feedback = document.getElementById('contact-feedback');
    const submitBtn = document.getElementById('contact-submit');

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedback.textContent = '';
      submitBtn.disabled = true;

      const data = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        message: document.getElementById('message').value.trim(),
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          feedback.textContent = 'Thanks — your message was sent.';
          contactForm.reset();
        } else {
          const json = await res.json().catch(() => ({}));
          feedback.textContent = "Please fill in all required fields";

        }
      } catch (err) {
        feedback.textContent = 'Network error — check your connection.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }


async function applyRoomAvailability() {
  try {
    const res = await fetch('/api/rooms');
    const json = await res.json();
    if (!json.success) return;

    const rooms = json.data;

  
    const roomSelect = document.getElementById('roomSelect');
    if (roomSelect) {
      for (let i = 0; i < roomSelect.options.length; i++) {
        const opt = roomSelect.options[i];
        const room = rooms.find(r => r.name === opt.value);
        if (room) {
          if (room.availableUnits <= 0) {
            opt.disabled = true;
            opt.text = `${room.name} (Sold out)`;
          } else {
            opt.disabled = false;
            opt.text = room.name;
          }
        }
      }
    }

    
    const cards = document.querySelectorAll('.room-card');
    cards.forEach(card => {
      const titleEl = card.querySelector('h3');
      const link = card.querySelector('a.btn');
      if (!titleEl) return;
      const name = titleEl.textContent.trim();
      const room = rooms.find(r => r.name === name);
      if (room) {
        const availSpan = card.querySelector('.availability-count');
        if (availSpan) availSpan.textContent = room.availableUnits;
        if (room.availableUnits <= 0) {
          card.classList.add('sold-out');
          if (link) {
            link.textContent = 'Sold Out';
            link.classList.add('disabled');
            link.removeAttribute('href');
          }
        } else {
          card.classList.remove('sold-out');
          if (link) {
            link.textContent = 'Book Inspection';
            link.classList.remove('disabled');
            const params = new URLSearchParams();
            params.set('room', name);
            link.href = `booking.html?${params.toString()}`;
          }
        }
      }
    });
  } catch (err) {
    console.error('Error applying room availability:', err);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  applyRoomAvailability();
});
