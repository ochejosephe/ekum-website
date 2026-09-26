document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('nav ul li a');
  const sections = document.querySelectorAll('section[id]');
  const serviceCards = document.querySelectorAll('.card');
  const form = document.querySelector('#contact-form');
  const formMessage = document.querySelector('.form-message');

  const scrollToSection = (hash) => {
    const target = document.querySelector(hash);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      if (link.hash) {
        event.preventDefault();
        scrollToSection(link.hash);
      }
    });
  });

  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      serviceCards.forEach(item => item.classList.remove('active'));
      card.classList.add('active');
    });
  });

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const data = {
        fullName: form.elements.fullName.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        message: form.elements.message.value.trim(),
      };

      if (!data.fullName || !data.email || !data.message) {
        formMessage.textContent = 'Please fill in your name, email, and message.';
        formMessage.style.color = '#d32f2f';
        return;
      }

      try {
        const response = await fetch('/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Submission failed.');
        }

        formMessage.textContent = result.message;
        formMessage.style.color = '#004d40';
        form.reset();
      } catch (error) {
        formMessage.textContent = error.message || 'Unable to send your message right now.';
        formMessage.style.color = '#d32f2f';
      }
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const id = entry.target.id;
      const activeLink = document.querySelector(`nav ul li a[href="#${id}"]`);
      if (entry.isIntersecting && activeLink) {
        navLinks.forEach(link => link.classList.remove('active'));
        activeLink.classList.add('active');
      }
    });
  }, {
    threshold: 0.5,
  });

  sections.forEach(section => observer.observe(section));
});