import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const listaCarrito = document.getElementById('lista-carrito');
const totalElemento = document.getElementById('total');
const btnWhatsApp = document.getElementById('btn-whatsapp');
const btnEliminarTodo = document.getElementById('btn-eliminar-todo');

let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

const firebaseConfig = {
  apiKey: "AIzaSyD-P5-GOlwT-Ax51u3giJm1G-oXmfOf9-g",
  authDomain: "tabymakeup-of.firebaseapp.com",
  projectId: "tabymakeup-of",
  storageBucket: "tabymakeup-of.appspot.com",
  messagingSenderId: "548834143470",
  appId: "1:548834143470:web:54812e64324b3629f617ff"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Imagen por defecto si no hay imagen disponible
const imagenPlaceholder = 'https://plabi.justicia.es/o/subastas-theme/images/image-not-available.png';

async function cargarProductos() {
  try {
    const snapshot = await getDocs(collection(db, "productos"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al cargar productos desde Firestore:", error);
    return [];
  }
}

async function actualizarCarrito() {
  let productosFirestore = [];
  try {
    productosFirestore = await cargarProductos();
  } catch (error) {
    console.error("Firestore no disponible, usando datos de localStorage:", error);
  }

  const productosActualizados = [];
  let hayProductosNoDisponibles = false;
  let mensajesCambio = [];
  let mensajesPrecio = [];

  for (const item of carrito) {
    const productoFirestore = productosFirestore.find(p => p.id === item.id);
    if (productoFirestore) {
      let disponible = productoFirestore.disponible;
      let mensajeNoDisponible = '';

      if (item.tono && productoFirestore.tonos) {
        const tonoEncontrado = productoFirestore.tonos.find(t => t.nombre === item.tono);
        if (!tonoEncontrado || !tonoEncontrado.disponible) {
          disponible = false;
          mensajeNoDisponible = ` (Tono no disponible)`;
          mensajesCambio.push(`${item.nombre}${mensajeNoDisponible}`);
        }
      }

      if (!disponible) {
        hayProductosNoDisponibles = true;
        productosActualizados.push({
          ...item,
          precio: productoFirestore.precio || item.precio,
          nombre: item.nombre,
          imagen: item.imagen || productoFirestore.imagen || imagenPlaceholder,
          disponible: false
        });
        continue;
      }

      const nuevoPrecio = parseFloat(productoFirestore.precio);
      const precioAnterior = parseFloat(item.precio);
      const nombreActualizado = productoFirestore.nombre + (item.tono ? ` - ${item.tono}` : '');

      if (nuevoPrecio !== precioAnterior) {
        const mensaje = `${nombreActualizado} cambió de $${precioAnterior.toFixed(2)} a $${nuevoPrecio.toFixed(2)}`;
        mensajesCambio.push(mensaje);
        mensajesPrecio.push(mensaje);
      }

      productosActualizados.push({
        ...item,
        precio: nuevoPrecio,
        nombre: item.nombre,
        imagen: item.imagen || productoFirestore.imagen || imagenPlaceholder,
        disponible: true
      });

    } else {
      // Producto eliminado de Firestore
      productosActualizados.push({
        ...item,
        disponible: false,
        imagen: item.imagen || imagenPlaceholder,
        nombre: item.nombre
      });
      hayProductosNoDisponibles = true;
      mensajesCambio.push(`${item.nombre} ya no está disponible (eliminado del catálogo)`);
    }
  }

  carrito = productosActualizados;
  localStorage.setItem('carrito', JSON.stringify(carrito));

  if (mensajesCambio.length > 0) {
    console.log("Cambios en el carrito:\n" + mensajesCambio.join('\n'));
  }

  if (mensajesPrecio.length > 0) {
    Swal.fire({
      title: 'Precios actualizados',
      html: mensajesPrecio.join('<br>'),
      icon: 'info',
      confirmButtonText: 'Aceptar'
    });
  }

  renderizarCarrito();
}


function renderizarCarrito() {
  listaCarrito.innerHTML = '';
  let total = 0;
  let hayProductosNoDisponibles = false;

  if (carrito.length === 0) {
    listaCarrito.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
    totalElemento.textContent = '0';
    if (btnWhatsApp) btnWhatsApp.disabled = true;
    actualizarWhatsApp();
    return;
  }

  carrito.forEach((producto, index) => {
    const li = document.createElement('li');
    li.className = producto.disponible ? '' : 'no-disponible';

    li.innerHTML = `
      <img src="${producto.imagen || imagenPlaceholder}" alt="${producto.nombre}" class="producto-imagen">
      <div class="producto-info">
        <span class="nombre-producto">${producto.nombre}</span>
        <span class="precio-producto">$${producto.precio}</span>
      </div>
      <div class="cantidad-controles">
        <button class="btn-restar" data-index="${index}">-</button>
        <span class="cantidad">${producto.cantidad}</span>
        <button class="btn-sumar" data-index="${index}" ${!producto.disponible ? 'disabled' : ''}>+</button>
      </div>
      <button class="btn-eliminar" data-index="${index}">
        <i class="fas fa-trash-alt"></i>
      </button>
      ${!producto.disponible ? '<span class="no-disponible-badge">No disponible</span>' : ''}
    `;

    listaCarrito.appendChild(li);

    if (producto.disponible) {
      total += producto.precio * producto.cantidad;
    } else {
      hayProductosNoDisponibles = true;
    }
  });

  totalElemento.textContent = total.toFixed(2);

  if (hayProductosNoDisponibles) {
    const advertencia = document.createElement('div');
    advertencia.className = 'advertencia-no-disponible';
    advertencia.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>Tienes productos no disponibles en tu carrito. Elimínalos para continuar.</span>
    `;
    listaCarrito.insertBefore(advertencia, listaCarrito.firstChild);
  }

  if (btnWhatsApp) {
    btnWhatsApp.disabled = hayProductosNoDisponibles || carrito.length === 0;
  }

  actualizarWhatsApp();
}

function eliminarProducto(index) {
  carrito.splice(index, 1);
  localStorage.setItem('carrito', JSON.stringify(carrito));
  renderizarCarrito();
}

if (btnEliminarTodo) {
  btnEliminarTodo.addEventListener('click', () => {
    if (carrito.length === 0) return;
    carrito = [];
    localStorage.removeItem('carrito');
    renderizarCarrito();
  });
}

function actualizarWhatsApp() {
  if (!btnWhatsApp) return;

  if (carrito.length === 0 || carrito.some(p => !p.disponible)) {
    btnWhatsApp.disabled = true;
    return;
  }

  let mensaje = "¡Hola! \n\nTe envío mi compra:\n\n";
  carrito.forEach(producto => {
    mensaje += `• ${producto.nombre}\n`;
    mensaje += `  Cantidad: ${producto.cantidad}\n`;
    mensaje += `  Precio: $${producto.precio} c/u\n`;
    mensaje += `  Subtotal: $${producto.precio * producto.cantidad}\n\n`;
  });

  const total = carrito.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
  mensaje += `*Total del pedido:* $${total.toFixed(2)}\n\n¡Gracias!`;

  const telefono = "5493735401893";
  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

  btnWhatsApp.disabled = false;
  btnWhatsApp.onclick = () => {
    Swal.fire({
      title: 'Enviando pedido...',
      text: 'Redirigiendo a WhatsApp',
      icon: 'info',
      allowOutsideClick: false,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      didOpen: () => {
        Swal.showLoading();
      },
      didClose: () => {
        window.open(url, '_blank');
        setTimeout(() => {
          carrito = [];
          localStorage.removeItem('carrito');
          renderizarCarrito();
        }, 500);
      }
    });
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await actualizarCarrito();
  } catch (error) {
    console.error("Error en la inicialización:", error);
    renderizarCarrito();
    actualizarWhatsApp();
  }

  listaCarrito.addEventListener('click', (e) => {
    const index = parseInt(e.target.dataset.index);

    if (e.target.classList.contains('btn-sumar')) {
      carrito[index].cantidad++;
      localStorage.setItem('carrito', JSON.stringify(carrito));
      renderizarCarrito();
    }

    if (e.target.classList.contains('btn-restar')) {
      carrito[index].cantidad--;
      if (carrito[index].cantidad < 1) {
        eliminarProducto(index);
      } else {
        localStorage.setItem('carrito', JSON.stringify(carrito));
        renderizarCarrito();
      }
    }

    if (e.target.classList.contains('btn-eliminar') || e.target.parentElement.classList.contains('btn-eliminar')) {
      const idx = e.target.dataset.index || e.target.parentElement.dataset.index;
      eliminarProducto(parseInt(idx));
    }
  });
});
