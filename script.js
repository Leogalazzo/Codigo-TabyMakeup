import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function() {
  // Evitar duplicar modalImagen: solo lo inyectamos si no está en el HTML.
  if (!document.getElementById('modalImagen')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="modalImagen" class="modal-imagen">
        <span class="cerrar-imagen">×</span>
        <img class="contenido-imagen" id="imagenAmpliada">
        <div class="pie-imagen"></div>
      </div>
    `);
  }

  // Configuración de Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyD-P5-GOlwT-Ax51u3giJm1G-oXmfOf9-g",
    authDomain: "tabymakeup-of.firebaseapp.com",
    projectId: "tabymakeup-of",
    storageBucket: "tabymakeup-of.appspot.com",
    messagingSenderId: "548834143470",
    appId: "1:548834143470:web:54812e64324b3629f617ff"
  };

  // Inicializar Firebase y Firestore
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Variables globales
  let todosProductos = [];
  let productoSeleccionado = null; // objeto producto {id,nombre,precio,...}
  let tonoSeleccionado = '';
  let imagenTonoSeleccionada = '';

  /* ----------------------------------------------------------- 
     CARGA DE PRODUCTOS
  ----------------------------------------------------------- */
  async function cargarProductos() {
    try {
      const snapshot = await getDocs(collection(db, "productos"));
      todosProductos = snapshot.docs.map(doc => normalizarProducto({ id: doc.id, ...doc.data() })).reverse();
      renderizarProductos();
      configurarBuscador();
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  }

  /* Normaliza cada producto para garantizar estructura uniforme. */
  function normalizarProducto(prod) {
    const p = { ...prod };
    // disponible default true si no viene
    if (typeof p.disponible === 'undefined') p.disponible = true;

    // Asegurar precio numérico/string manejable
    if (p.precio === null || typeof p.precio === 'undefined') p.precio = '0';

    // Normalizar tonos: puede venir array de strings u objetos
    if (Array.isArray(p.tonos)) {
      p.tonos = p.tonos.map(t => {
        if (typeof t === 'string') {
          // string simple => {nombre: t, imagen:'', disponible:true}
          return { nombre: t, imagen: '', disponible: true };
        } else {
          return {
            nombre: t.nombre || 'Sin nombre',
            imagen: t.imagen || '',
            disponible: typeof t.disponible === 'undefined' ? true : !!t.disponible
          };
        }
      });
    } else {
      p.tonos = [];
    }
    return p;
  }

  /* ----------------------------------------------------------- 
     RENDERIZADO DE PRODUCTOS
  ----------------------------------------------------------- */
  function renderizarProductos(filtro = "") {
    const contenedorTodos = document.getElementById("contenedor-todos");
    const secciones = document.querySelectorAll(".seccion-productos");
    if (!contenedorTodos || !secciones.length) return;

    // Limpiar contenedores
    contenedorTodos.innerHTML = "";
    secciones.forEach(seccion => {
      const contenedor = seccion.querySelector(".productos-container");
      if (contenedor) contenedor.innerHTML = "";
    });

    // Crear/actualizar título de resultados
    let resultadosTitulo = document.getElementById("resultados-titulo");
    if (!resultadosTitulo) {
      resultadosTitulo = document.createElement("h2");
      resultadosTitulo.id = "resultados-titulo";
      resultadosTitulo.className = "resultados-busqueda";
      const sectionTodos = document.getElementById("todos");
      sectionTodos.insertBefore(resultadosTitulo, contenedorTodos);
    }

    // Mostrar u ocultar el título segun filtro
    const tituloTodos = document.querySelector("#todos h2:not(#resultados-titulo)");
    if (filtro) {
      resultadosTitulo.textContent = `Resultados de la búsqueda: "${filtro}"`;
      resultadosTitulo.style.display = "block";
      if (tituloTodos) tituloTodos.style.display = "none";
    } else {
      resultadosTitulo.style.display = "none";
      if (tituloTodos) tituloTodos.style.display = "block";
    }

    // Filtrado
    let productosFiltrados = todosProductos;
    if (filtro) {
      const term = filtro.toLowerCase();
      productosFiltrados = todosProductos.filter(producto =>
        producto.nombre.toLowerCase().includes(term) ||
        (producto.categoria && producto.categoria.toLowerCase().includes(term))
      );
    }

    // Renderizar
    if (productosFiltrados.length === 0 && filtro) {
      contenedorTodos.innerHTML = `<p class="sin-resultados">No se encontraron productos para "${filtro}"</p>`;
    } else {
      productosFiltrados.forEach(producto => {
        const html = crearHTMLProducto(producto);
        // Sección Todos
        contenedorTodos.insertAdjacentHTML('beforeend', html);
        // Sección específica solo si no hay filtro
        if (!filtro) {
          const seccion = document.getElementById(producto.categoria);
          if (seccion) {
            const contenedor = seccion.querySelector('.productos-container');
            if (contenedor) contenedor.insertAdjacentHTML('beforeend', html);
          }
        }
      });
    }

    // Ocultar secciones vacías cuando hay filtro
    secciones.forEach(seccion => {
      const contenedor = seccion.querySelector('.productos-container');
      if (contenedor) {
        seccion.style.display = filtro && seccion.id !== 'todos' && contenedor.children.length === 0 ? 'none' : 'block';
      }
    });

    // Re-vincular eventos
    setupProductosConTonos();
    configurarBotonesAgregar();
    if (window.lightbox && typeof lightbox.init === 'function') {
      lightbox.init();
    }
  }

  // HTML de producto
  function crearHTMLProducto(producto) {
    const tieneTonos = producto.tonos && producto.tonos.length > 0;
    return `
      <div class="producto ${!producto.disponible ? 'no-disponible' : ''}">
        <a href="${producto.imagen || ''}" data-lightbox="galeria">
          <img src="${producto.imagen || 'placeholder.jpg'}" alt="${producto.nombre}" class="imagen-producto">
        </a>
        <h3>${producto.nombre}</h3>
        ${producto.disponible ? `<p>Precio: $<span class="precio">${producto.precio}</span></p>` : '<p class="no-disponible-text">No disponible</p>'}
        <button class="agregar-carrito ${tieneTonos ? 'con-tonos' : ''}"
          data-id="${producto.id}"
          data-nombre="${producto.nombre}"
          data-precio="${producto.precio}"
          ${!producto.disponible ? 'disabled' : ''}
          ${tieneTonos ? 'data-has-tonos="1"' : ''}>
          Agregar al carrito
        </button>
      </div>`;
  }

  /* ----------------------------------------------------------- 
     BUSCADOR
  ----------------------------------------------------------- */
  function configurarBuscador() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
      console.error('El elemento #searchInput no se encontró en el DOM');
      return;
    }
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase().trim();
      renderizarProductos(searchTerm);
    });
  }

  /* ----------------------------------------------------------- 
     BOTONES SIN TONOS
  ----------------------------------------------------------- */
  function configurarBotonesAgregar() {
    document.querySelectorAll('.agregar-carrito:not(.con-tonos)').forEach(boton => {
      boton.addEventListener('click', function() {
        if (this.disabled) return;
        agregarAlCarrito(
          this.getAttribute('data-id'),
          this.getAttribute('data-nombre'),
          this.getAttribute('data-precio')
        );
      });
    });
  }

  /* ----------------------------------------------------------- 
     PRODUCTOS CON TONOS
  ----------------------------------------------------------- */
  function setupProductosConTonos() {
    const modal = document.getElementById('modalTonos');
    if (!modal) return;

    const tonosContainer = modal.querySelector('.tonos-container');
    const imagenVistaPrevia = document.getElementById('imagenVistaPrevia');
    const vistaPreviaContainer = modal.querySelector('.vista-previa');
    const botonAgregarModal = modal.querySelector('.modal-contenido button');

    // Limpiar listeners previos clonando el botón (truco simple)
    const nuevoBotonAgregar = botonAgregarModal.cloneNode(true);
    botonAgregarModal.parentNode.replaceChild(nuevoBotonAgregar, botonAgregarModal);

    // Cerrar (reset + ocultar)
    const cerrarSpan = modal.querySelector('.cerrar');
    if (cerrarSpan) {
      cerrarSpan.addEventListener('click', () => cerrarModalTonos());
    }

    // Click fuera del contenido -> cerrar
    modal.addEventListener('click', e => {
      if (e.target === modal) cerrarModalTonos();
    });

    // Esc tecla
    document.addEventListener('keydown', escHandlerModalTonos);

    // Vincular cada botón de producto con tonos
    document.querySelectorAll('.agregar-carrito.con-tonos').forEach(boton => {
      boton.addEventListener('click', function() {
        if (this.disabled) return;
        const id = this.getAttribute('data-id');
        const prod = todosProductos.find(p => p.id === id);
        if (!prod) return;
        productoSeleccionado = prod;
        tonoSeleccionado = '';
        imagenTonoSeleccionada = '';

        // Render tonos en modal
        renderTonosEnModal(prod, tonosContainer, imagenVistaPrevia, vistaPreviaContainer, nuevoBotonAgregar);
        abrirModalTonos();
      });
    });
  }

  /* Renderiza los botones de tonos dentro del modal. */
  function renderTonosEnModal(prod, tonosContainer, imagenVistaPrevia, vistaPreviaContainer, botonAgregarModal) {
    tonosContainer.innerHTML = '';
    if (vistaPreviaContainer) vistaPreviaContainer.style.display = 'none';
    if (imagenVistaPrevia) {
      imagenVistaPrevia.style.display = 'none';
      imagenVistaPrevia.removeAttribute('src');
      imagenVistaPrevia.removeAttribute('alt');
    }

    const tonos = Array.isArray(prod.tonos) ? prod.tonos : [];
    let disponibles = 0;

    if (tonos.length === 0) {
      tonosContainer.innerHTML = '<p style="text-align: center;">Este producto no tiene tonos.</p>';
    } else {
      tonos.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'tono';
        btn.setAttribute('data-tono', t.nombre.trim());
        if (t.imagen) btn.setAttribute('data-imagen', t.imagen.trim());
        btn.innerHTML = t.disponible ? t.nombre.trim() : `${t.nombre.trim()}<br><small>Sin stock</small>`;

        if (!t.disponible) {
          btn.classList.add('no-disponible');
          btn.disabled = true;
        } else {
          disponibles++;
          btn.addEventListener('click', function() {
            document.querySelectorAll('.tono').forEach(el => el.classList.remove('seleccionado'));
            this.classList.add('seleccionado');
            tonoSeleccionado = this.getAttribute('data-tono');
            imagenTonoSeleccionada = this.getAttribute('data-imagen') || '';

            if (imagenTonoSeleccionada && imagenVistaPrevia && vistaPreviaContainer) {
              imagenVistaPrevia.src = imagenTonoSeleccionada;
              imagenVistaPrevia.alt = `Vista previa de ${tonoSeleccionado}`;
              imagenVistaPrevia.style.display = 'block';
              vistaPreviaContainer.style.display = 'flex';
            } else if (vistaPreviaContainer) {
              vistaPreviaContainer.style.display = 'none';
            }
          });
        }

        tonosContainer.appendChild(btn);
      });
    }

    // Configurar botón agregar según disponibilidad
    if (botonAgregarModal) {
      if (tonos.length === 0) {
        // Si no hay tonos, permitir agregar directamente
        botonAgregarModal.textContent = 'Agregar al carrito';
        botonAgregarModal.disabled = !prod.disponible;
        botonAgregarModal.addEventListener('click', function() {
          if (!productoSeleccionado) return;
          agregarAlCarrito(
            productoSeleccionado.id,
            productoSeleccionado.nombre,
            productoSeleccionado.precio,
            '',
            ''
          );
          cerrarModalTonos();
        });
      } else {
        botonAgregarModal.textContent = disponibles > 0 ? 'Agregar al carrito' : 'Sin tonos disponibles';
        botonAgregarModal.disabled = disponibles === 0;
        botonAgregarModal.addEventListener('click', function() {
          if (!productoSeleccionado) return;
          if (disponibles > 0 && tonoSeleccionado) {
            agregarAlCarrito(
              productoSeleccionado.id,
              productoSeleccionado.nombre,
              productoSeleccionado.precio,
              tonoSeleccionado,
              imagenTonoSeleccionada
            );
            cerrarModalTonos();
          } else if (disponibles > 0 && !tonoSeleccionado) {
            Swal.fire('Selección requerida', 'Por favor seleccioná un tono disponible.', 'warning');
          }
        });
      }
    }

    // Vista previa ampliable
    if (imagenVistaPrevia) {
      imagenVistaPrevia.addEventListener('click', function() {
        if (!this.src || this.style.display === 'none') return;
        abrirModalImagen(this.src, this.alt);
      });
    }
  }

  function abrirModalTonos() {
    const modal = document.getElementById('modalTonos');
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  function cerrarModalTonos() {
    const modal = document.getElementById('modalTonos');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  function escHandlerModalTonos(e) {
    if (e.key === 'Escape') cerrarModalTonos();
  }

  /* ----------------------------------------------------------- 
     MODAL IMAGEN AMPLIADA (uso compartido con vista previa de tono)
  ----------------------------------------------------------- */
  function abrirModalImagen(src, altText = '') {
    const modalImagen = document.getElementById('modalImagen');
    const imagenAmpliada = document.getElementById('imagenAmpliada');
    const pieImagen = document.querySelector('.pie-imagen');
    if (!modalImagen || !imagenAmpliada || !pieImagen) return;

    imagenAmpliada.src = src;
    imagenAmpliada.alt = altText;
    pieImagen.textContent = altText;
    modalImagen.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  // Cerrar modal de imagen
  (function configurarModalImagenGlobal(){
    const modalImagen = document.getElementById('modalImagen');
    if (!modalImagen) return;
    const cerrarImagen = document.querySelector('.cerrar-imagen');
    if (cerrarImagen) {
      cerrarImagen.addEventListener('click', function() {
        modalImagen.style.display = 'none';
        document.body.style.overflow = 'auto';
      });
    }
    modalImagen.addEventListener('click', function(event) {
      if (event.target === modalImagen) {
        modalImagen.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    });
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && modalImagen.style.display === 'block') {
        modalImagen.style.display = 'none';
        document.body.style.overflow = 'auto';
      }
    });
  })();

  /* ----------------------------------------------------------- 
     CARRITO
  ----------------------------------------------------------- */
  function agregarAlCarrito(id, nombre, precio, tono = '', imagenTono = '') {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const productoExistente = carrito.find(item => item.id === id && item.tono === tono);

    if (productoExistente) {
      productoExistente.cantidad = (productoExistente.cantidad || 1) + 1;
    } else {
      const productoOriginal = todosProductos.find(p => p.id === id);
      const imagenBase = imagenTono || productoOriginal?.imagen || 'placeholder.jpg';
      carrito.push({ 
        id, 
        nombre: nombre + (tono ? ` - ${tono}` : ''), 
        precio, 
        cantidad: 1, 
        tono,
        imagen: imagenBase,
        disponible: true
      });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    mostrarNotificacion(`¡${nombre}${tono ? ' - ' + tono : ''} agregado al carrito!`);
  }

  function actualizarCarrito() {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    let totalItems = carrito.reduce((total, item) => total + (item.cantidad || 1), 0);

    // Contador flotante
    const contadorFlotante = document.querySelector('.carrito-contador');
    const carritoFlotante = document.querySelector('.carrito-flotante');
    if (contadorFlotante && carritoFlotante) {
      contadorFlotante.textContent = totalItems;
      carritoFlotante.setAttribute('data-count', totalItems);
      contadorFlotante.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Página carrito (si existe)
    if (document.getElementById('lista-carrito')) {
      const listaCarrito = document.getElementById('lista-carrito');
      const totalElement = document.getElementById('total');
      listaCarrito.innerHTML = '';

      if (carrito.length === 0) {
        listaCarrito.innerHTML = '';
      } else {
        let total = 0;
        carrito.forEach((producto, index) => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span class="nombre-producto">${producto.nombre}</span>
            <span class="precio-producto">$${producto.precio}</span>
            <button class="eliminar-producto" data-index="${index}">×</button>`;
          listaCarrito.appendChild(li);
          total += parseFloat(producto.precio) * (producto.cantidad || 1);
        });
        if (totalElement) totalElement.textContent = total.toFixed(2);

        // Eliminar
        document.querySelectorAll('.eliminar-producto').forEach(boton => {
          boton.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            const producto = carrito[index];
            Swal.fire({
              title: '¿Eliminar producto?',
              html: `¿Estás seguro que deseas eliminar <strong>${producto.nombre}</strong> del carrito?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Sí, eliminar',
              cancelButtonText: 'Cancelar'
            }).then((result) => {
              if (result.isConfirmed) {
                carrito.splice(index, 1);
                localStorage.setItem('carrito', JSON.stringify(carrito));
                actualizarCarrito();
                mostrarNotificacion(`${producto.nombre} eliminado del carrito`);
              }
            });
          });
        });
      }
    }
  }

  /* ----------------------------------------------------------- 
     NOTIFICACIONES
  ----------------------------------------------------------- */
  function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion-carrito';
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);

    setTimeout(() => notificacion.classList.add('mostrar'), 10);
    setTimeout(() => {
      notificacion.classList.remove('mostrar');
      setTimeout(() => document.body.removeChild(notificacion), 300);
    }, 3000);
  }

  /* ----------------------------------------------------------- 
     BOTÓN WHATSAPP (sólo en carrito.html)
  ----------------------------------------------------------- */
  (function configurarBotonWhatsApp(){
    const btn = document.getElementById('btn-whatsapp');
    if (!btn) return; // no estamos en carrito.html

    btn.addEventListener('click', function() {
      const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
      const total = document.getElementById('total')?.textContent || '0.00';

      if (carrito.length === 0) {
        mostrarNotificacion('Tu carrito está vacío');
        return;
      }

      let mensaje = '¡Hola! Quiero hacer este pedido:\n\n';
      carrito.forEach(item => {
        mensaje += `- ${item.nombre} (${item.cantidad || 1}x): $${item.precio}\n`;
      });
      mensaje += `\nTotal: $${total}\n\nGracias!`;

      const encoded = encodeURIComponent(mensaje);
      window.open(`https://wa.me/5493735401893?text=${encoded}`, '_blank');
    });
  })();

  /* ----------------------------------------------------------- 
     INICIALIZAR
  ----------------------------------------------------------- */
  cargarProductos();
  actualizarCarrito();
});