import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', function() {
  // Agregar modal para imágenes ampliadas al DOM
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modalImagen" class="modal-imagen">
      <span class="cerrar-imagen">×</span>
      <img class="contenido-imagen" id="imagenAmpliada">
      <div class="pie-imagen"></div>
    </div>
  `);

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
  let productoSeleccionado = null;
  let tonoSeleccionado = '';

  // Función para debounce
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Función para obtener el nombre de visualización de una categoría
  function getCategoriaDisplayName(categoria) {
    const categorias = {
      'iluminadores': 'Iluminadores y contornos',
      'base': 'Base',
      'brochas': 'Brochas',
      'delineadores': 'Delineadores',
      'fijador': 'Fijador',
      'mascara': 'Máscara de pestañas',
      'polvos': 'Polvos',
      'rubor': 'Rubor',
      'sombras': 'Sombras',
      'arqueadores': 'Arqueadores',
      'brillos': 'Brillos/Glitter',
      'correctores': 'Correctores',
      'esponjitas': 'Esponjitas',
      'labiales': 'Labiales',
      'pestanas-cejas': 'Pestañas/Cejas',
      'primer': 'Primer',
      'skincare': 'Skincare',
      'uñas': 'Uñas',
      'skalas': 'Skalas',
      'varios': 'Varios'
    };
    return categorias[categoria] || categoria;
  }

  // Función para obtener sugerencias de búsqueda
  function getSugerenciaBusqueda(termino) {
    const sugerencias = {
      'base': 'bases',
      'sombra': 'sombras',
      'delineador': 'delineadores',
      'mascara': 'máscaras',
      'rubor': 'rubores',
      'labial': 'labiales',
      'brocha': 'brochas',
      'esponjita': 'esponjitas',
      'corrector': 'correctores',
      'primer': 'primers',
      'fijador': 'fijadores',
      'polvo': 'polvos',
      'arqueador': 'arqueadores',
      'brillo': 'brillos',
      'glitter': 'brillos',
      'skincare': 'cuidado de la piel',
      'uña': 'uñas',
      'skala': 'skalas'
    };
    
    const terminoLower = termino.toLowerCase();
    for (const [key, value] of Object.entries(sugerencias)) {
      if (terminoLower.includes(key)) {
        return value;
      }
    }
    return termino;
  }

  // Función para configurar sugerencias de búsqueda
  function configurarSugerenciasBusqueda() {
    document.querySelectorAll('.sugerencia-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const sugerencia = this.getAttribute('data-sugerencia');
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.value = sugerencia;
          searchInput.dispatchEvent(new Event('input'));
        }
      });
    });
  }

  // Función principal para cargar y renderizar productos
  async function cargarProductos() {
    try {
      const snapshot = await getDocs(collection(db, "productos"));
      todosProductos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordenar productos: nuevos primero, sin stock al final
      todosProductos = ordenarProductos(todosProductos);
      
      renderizarProductos();
      configurarBuscador();
      configurarFiltros();
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  }

  // Función para ordenar productos inteligentemente
  // Prioridad de ordenamiento:
  // 1. Productos marcados como "Nuevo" (esNuevo = true) aparecen primero
  // 2. Entre productos nuevos, se ordenan por fecha de subida (más reciente primero)
  // 3. Productos con stock aparecen antes que productos sin stock
  // 4. Entre productos con el mismo estado de stock, se ordenan por fecha de subida
  function ordenarProductos(productos) {
    return [...productos].sort((a, b) => {
      // 1. Productos nuevos primero (esNuevo = true)
      if (a.esNuevo && !b.esNuevo) return -1;
      if (!a.esNuevo && b.esNuevo) return 1;
      
      // 2. Si ambos son nuevos, ordenar por fecha de subida (más reciente primero)
      if (a.esNuevo && b.esNuevo) {
        const fechaA = a.fechaSubida ? new Date(a.fechaSubida) : new Date(0);
        const fechaB = b.fechaSubida ? new Date(b.fechaSubida) : new Date(0);
        return fechaB - fechaA;
      }
      
      // 3. Productos con stock antes que productos sin stock
      if (a.disponible && !b.disponible) return -1;
      if (!a.disponible && b.disponible) return 1;
      
      // 4. Si ambos tienen el mismo estado de stock, ordenar por fecha de subida
      const fechaA = a.fechaSubida ? new Date(a.fechaSubida) : new Date(0);
      const fechaB = b.fechaSubida ? new Date(b.fechaSubida) : new Date(0);
      return fechaB - fechaA;
    });
  }

  // Función para reordenar productos cuando se actualicen
  function reordenarProductos() {
    todosProductos = ordenarProductos(todosProductos);
    renderizarProductos();
  }

  // Configurar listener para cambios en tiempo real (opcional)
  function configurarListenerTiempoReal() {
    // Esta función se puede usar en el futuro para actualizaciones en tiempo real
    // Por ahora, el reordenamiento se hace cada vez que se cargan los productos
  }

    // Función para renderizar productos con filtrado
  function renderizarProductos(filtro = "", categoria = "all", disponible = "all") {
    const contenedorTodos = document.getElementById("contenedor-todos");
    const secciones = document.querySelectorAll(".seccion-productos");
    const loadingIndicator = document.getElementById("loadingIndicator");

    if (!contenedorTodos || !secciones.length) return;

    if (loadingIndicator) loadingIndicator.style.display = "block";

    // Limpiar contenedores
    contenedorTodos.innerHTML = "";
    contenedorTodos.classList.remove('sin-resultados');
    secciones.forEach(seccion => {
      const contenedor = seccion.querySelector(".productos-container");
      if (contenedor) contenedor.innerHTML = "";
    });

    // Crear o actualizar el contenedor de resultados de búsqueda
    let resultadosTitulo = document.getElementById("resultados-titulo");
    if (!resultadosTitulo) {
      resultadosTitulo = document.createElement("div");
      resultadosTitulo.id = "resultados-titulo";
      resultadosTitulo.className = "resultados-busqueda";
      const sectionTodos = document.getElementById("todos");
      sectionTodos.insertBefore(resultadosTitulo, contenedorTodos);
    }

    // Filtrar productos primero
    let productosFiltrados = todosProductos;
    if (filtro) {
      productosFiltrados = productosFiltrados.filter(producto =>
        producto.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        (producto.categoria && producto.categoria.toLowerCase().includes(filtro.toLowerCase())) ||
        (producto.descripcion && producto.descripcion.toLowerCase().includes(filtro.toLowerCase()))
      );
    }
    if (categoria !== "all") {
      productosFiltrados = productosFiltrados.filter(producto => producto.categoria === categoria);
    }
    if (disponible === "available") {
      productosFiltrados = productosFiltrados.filter(producto => producto.disponible);
    } else if (disponible === "unavailable") {
      productosFiltrados = productosFiltrados.filter(producto => !producto.disponible);
    }

    // Mostrar u ocultar el título de resultados según el filtro
    const tituloTodos = document.querySelector("#todos h2:not(#resultados-titulo)");
    if (filtro || categoria !== "all" || disponible !== "all") {
      const totalResultados = productosFiltrados.length;
      const terminoBusqueda = filtro || 'todos los productos';
      const categoriaFiltro = categoria !== "all" ? ` en ${getCategoriaDisplayName(categoria)}` : '';
      const disponibilidadFiltro = disponible !== "all" ? ` (${disponible === "available" ? "disponibles" : "no disponibles"})` : '';
      
      resultadosTitulo.innerHTML = `
        <div class="resultados-header">
          <div class="resultados-info">
            <i class="fas fa-search"></i>
            <span class="resultados-texto">
              ${totalResultados === 1 ? '1 producto encontrado' : `${totalResultados} productos encontrados`}
            </span>
          </div>
          <div class="resultados-filtros">
            <span class="termino-busqueda">"${terminoBusqueda}"</span>
            ${categoriaFiltro ? `<span class="filtro-categoria">${categoriaFiltro}</span>` : ''}
            ${disponibilidadFiltro ? `<span class="filtro-disponibilidad">${disponibilidadFiltro}</span>` : ''}
          </div>
        </div>
        ${filtro ? `<div class="sugerencias-busqueda">
          <span>Sugerencias:</span>
          <button class="sugerencia-btn" data-sugerencia="${getSugerenciaBusqueda(filtro)}">${getSugerenciaBusqueda(filtro)}</button>
        </div>` : ''}
      `;
      resultadosTitulo.style.display = "block";
      if (tituloTodos) tituloTodos.style.display = "none";
      
      // Configurar sugerencias de búsqueda
      configurarSugerenciasBusqueda();
    } else {
      resultadosTitulo.style.display = "none";
      if (tituloTodos) tituloTodos.style.display = "block";
    }

    // Renderizar productos o mensaje de no resultados
    if (productosFiltrados.length === 0) {
      const terminoBusqueda = filtro || 'los filtros seleccionados';
      const categoriaFiltro = categoria !== "all" ? ` en ${getCategoriaDisplayName(categoria)}` : '';
      const disponibilidadFiltro = disponible !== "all" ? ` (${disponible === "available" ? "disponibles" : "no disponibles"})` : '';
      
      contenedorTodos.innerHTML = `
        <div class="sin-resultados-container">
          <div class="sin-resultados-icono">
            <i class="fas fa-search"></i>
          </div>
          <h3 class="sin-resultados-titulo">No se encontraron productos</h3>
          <p class="sin-resultados-texto">
            No hay productos que coincidan con <strong>"${terminoBusqueda}"</strong>${categoriaFiltro}${disponibilidadFiltro}
          </p>
          <div class="sin-resultados-sugerencias">
            <p>Sugerencias:</p>
            <ul>
              <li>Verifica que las palabras estén escritas correctamente</li>
              <li>Intenta con términos más generales</li>
              <li>Prueba con sinónimos</li>
              <li>Revisa los filtros aplicados</li>
            </ul>
          </div>
          <button class="btn-limpiar-busqueda" onclick="limpiarBusqueda()">
            <i class="fas fa-times"></i> Limpiar búsqueda
          </button>
        </div>
      `;
      
      // Agregar clase para cambiar el display del contenedor
      contenedorTodos.classList.add('sin-resultados');
    } else {
      // Remover clase de sin resultados si existe
      contenedorTodos.classList.remove('sin-resultados');
      
      productosFiltrados.forEach(producto => {
        const productoHTML = crearHTMLProducto(producto);
        contenedorTodos.innerHTML += productoHTML;
        if (!filtro && categoria === "all" && disponible === "all") {
          const seccion = document.getElementById(producto.categoria);
          if (seccion) {
            const contenedor = seccion.querySelector(".productos-container");
            if (contenedor) contenedor.innerHTML += productoHTML;
          }
        }
      });
    }

    // Mostrar u ocultar mensaje en la sección de ofertas
    const seccionOfertas = document.getElementById('ofertas');
    if (seccionOfertas) {
      let mensajeSinOfertas = seccionOfertas.querySelector('.mensaje-sin-ofertas');
      if (!mensajeSinOfertas) {
        mensajeSinOfertas = document.createElement('p');
        mensajeSinOfertas.className = 'mensaje-sin-ofertas';
        mensajeSinOfertas.textContent = 'No hay ofertas disponibles en este momento.';
        mensajeSinOfertas.style.display = 'none';
        seccionOfertas.insertBefore(mensajeSinOfertas, seccionOfertas.querySelector('.productos-container'));
      }

      const contenedorOfertas = seccionOfertas.querySelector('.productos-container');
      if (contenedorOfertas && contenedorOfertas.children.length === 0) {
        mensajeSinOfertas.style.display = 'block';
      } else {
        mensajeSinOfertas.style.display = 'none';
      }
    }

    // Ocultar secciones vacías o no relevantes
    secciones.forEach(seccion => {
      const contenedor = seccion.querySelector(".productos-container");
      if (contenedor) {
        seccion.style.display = (filtro || categoria !== "all" || disponible !== "all") && seccion.id !== "todos" && contenedor.children.length === 0 ? "none" : "block";
      }
    });

    // Configurar eventos
    setupProductosConTonos();
    configurarBotonesAgregar();
    configurarImagenesAmpliables();

    if (loadingIndicator) loadingIndicator.style.display = "none";
  }



  // Función para crear el HTML de un producto
  function crearHTMLProducto(producto) {
  const esNuevoPorFecha = producto.fechaSubida 
    ? (Date.now() - new Date(producto.fechaSubida).getTime()) / (1000 * 60 * 60 * 24) <= 15
    : false;
  const esNuevo = producto.esNuevo || esNuevoPorFecha;
    return `
      <div class="producto ${!producto.disponible ? 'no-disponible' : ''}">
        <div class="producto-imagen-container">
          <img src="${producto.imagen || 'placeholder.jpg'}" alt="${producto.nombre}" class="imagen-producto imagen-ampliable" data-producto-id="${producto.id}">
          ${esNuevo ? '<span class="badge-nuevo">Nuevo</span>' : ''}
        </div>
        <h3>${producto.nombre}</h3>
        ${producto.disponible ? `<p>Precio: $<span class="precio">${producto.precio}</span></p>` : '<p class="no-disponible-text">Sin stock</p>'}
        <button class="agregar-carrito ${producto.tonos && producto.tonos.length > 0 ? 'con-tonos' : ''}"
          data-id="${producto.id}"
          data-nombre="${producto.nombre}"
          data-precio="${producto.precio}"
          ${producto.tonos && producto.tonos.length > 0 ? `data-tonos="${producto.tonos.map(t => t.nombre).join(',')}" data-imagenes-tonos="${producto.tonos.map(t => t.imagen).join(',')}"` : ''}
          ${!producto.disponible ? 'disabled' : ''}>
          Agregar al carrito
        </button>
      </div>
    `;
  }

  // Configurar el buscador
  function configurarBuscador() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
      console.error('El elemento #searchInput no se encontró en el DOM');
      return;
    }

    const debouncedRender = debounce(() => {
      const searchTerm = searchInput.value.trim();
      const categoriaFiltro = document.getElementById('categoriaFiltro')?.value || 'all';
      const disponibilidadFiltro = document.getElementById('disponibilidadFiltro')?.value || 'all';
      renderizarProductos(searchTerm, categoriaFiltro, disponibilidadFiltro);
    }, 300);

    searchInput.addEventListener('input', debouncedRender);
  }

  // Configurar filtros
  function configurarFiltros() {
    const categoriaFiltro = document.getElementById('categoriaFiltro');
    const disponibilidadFiltro = document.getElementById('disponibilidadFiltro');

    if (categoriaFiltro && disponibilidadFiltro) {
      const debouncedRender = debounce(() => {
        const searchTerm = document.getElementById('searchInput')?.value.trim() || '';
        const categoria = categoriaFiltro.value;
        const disponible = disponibilidadFiltro.value;
        renderizarProductos(searchTerm, categoria, disponible);
      }, 300);

      categoriaFiltro.addEventListener('change', debouncedRender);
      disponibilidadFiltro.addEventListener('change', debouncedRender);
    }
  }

  // Configurar botones "Agregar al carrito" sin tonos
  function configurarBotonesAgregar() {
    document.querySelectorAll('.agregar-carrito:not(.con-tonos)').forEach(boton => {
      boton.addEventListener('click', function() {
        agregarAlCarrito(
          this.getAttribute('data-id'),
          this.getAttribute('data-nombre'),
          this.getAttribute('data-precio')
        );
      });
    });
  }

  // Configurar imágenes ampliables
  function configurarImagenesAmpliables() {
    // Configurar imágenes de productos
    document.querySelectorAll('.imagen-producto.imagen-ampliable').forEach(img => {
      img.addEventListener('click', function() {
        const productoId = this.getAttribute('data-producto-id');
        const producto = todosProductos.find(p => p.id === productoId);
        
        if (producto) {
          const imagenes = [];
          
          // Agregar imagen principal
          if (producto.imagen) {
            imagenes.push({
              src: producto.imagen,
              alt: producto.nombre
            });
          }
          
          // Agregar imágenes de tonos si existen
          if (producto.tonos && producto.tonos.length > 0) {
            producto.tonos.forEach(tono => {
              if (tono.imagen && tono.imagen.trim() !== '') {
                imagenes.push({
                  src: tono.imagen,
                  alt: `${producto.nombre} - ${tono.nombre}`
                });
              }
            });
          }
          
          if (imagenes.length > 0) {
            imageModal.abrir(imagenes);
          }
        }
      });
    });
  }

  // Configurar productos con tonos
  function setupProductosConTonos() {
    const modal = document.getElementById('modalTonos');
    if (!modal) return;

    const tonosContainer = modal.querySelector('.tonos-container');
    const imagenVistaPrevia = document.getElementById('imagenVistaPrevia');
    const vistaPreviaContainer = modal.querySelector('.vista-previa');

    // Limpiar eventos previos del botón de agregar en el modal
    const botonAgregarModal = modal.querySelector('.modal-contenido button');
    const nuevoBotonAgregar = botonAgregarModal.cloneNode(true);
    botonAgregarModal.parentNode.replaceChild(nuevoBotonAgregar, botonAgregarModal);

    document.querySelectorAll('.agregar-carrito.con-tonos').forEach(boton => {
      boton.addEventListener('click', function() {
        productoSeleccionado = {
          id: this.getAttribute('data-id'),
          nombre: this.getAttribute('data-nombre'),
          precio: this.getAttribute('data-precio')
        };

        const tonos = this.getAttribute('data-tonos').split(',');
        const imagenesTonos = this.getAttribute('data-imagenes-tonos').split(',');

        tonosContainer.innerHTML = '';
        if (vistaPreviaContainer) vistaPreviaContainer.style.display = 'none';
        if (imagenVistaPrevia) imagenVistaPrevia.style.display = 'none';

        const producto = todosProductos.find(p => p.id === productoSeleccionado.id);
        tonos.forEach((tono, index) => {
          const tonoData = producto.tonos[index];
          const divTono = document.createElement('div');
          divTono.className = 'tono-item';
          
          const nombreTono = document.createElement('span');
          nombreTono.className = 'nombre-tono';
          nombreTono.textContent = tono.trim();
          if (!tonoData.disponible) {
            nombreTono.classList.add('no-disponible');
          }
          divTono.appendChild(nombreTono);

          if (!tonoData.disponible) {
            const spanNoDisponible = document.createElement('span');
            spanNoDisponible.className = 'no-disponible-text';
            spanNoDisponible.textContent = 'Sin stock';
            divTono.appendChild(spanNoDisponible);
          } else {
            const botonTono = document.createElement('button');
            botonTono.className = 'tono';
            botonTono.setAttribute('data-tono', tono.trim());
            if (imagenesTonos[index] && imagenesTonos[index].trim() !== '') {
              botonTono.setAttribute('data-imagen', imagenesTonos[index].trim());
            }
            botonTono.textContent = 'Seleccionar';
            
            botonTono.addEventListener('click', function() {
              document.querySelectorAll('.tono').forEach(t => t.classList.remove('seleccionado'));
              this.classList.add('seleccionado');
              tonoSeleccionado = this.getAttribute('data-tono');

              const imagen = this.getAttribute('data-imagen');
              if (imagen && imagenVistaPrevia && vistaPreviaContainer) {
                imagenVistaPrevia.src = imagen;
                imagenVistaPrevia.alt = `Vista previa de ${tonoSeleccionado}`;
                imagenVistaPrevia.style.display = 'block';
                vistaPreviaContainer.style.display = 'flex';
              }
            });

            divTono.appendChild(botonTono);
          }

          tonosContainer.appendChild(divTono);
        });

        modal.style.display = 'block';
        tonoSeleccionado = '';
      });
    });

    // Configurar botón de agregar en el modal
    nuevoBotonAgregar.addEventListener('click', function() {
      if (tonoSeleccionado && productoSeleccionado) {
        agregarAlCarrito(
          productoSeleccionado.id,
          productoSeleccionado.nombre,
          productoSeleccionado.precio,
          tonoSeleccionado
        );
        modal.style.display = 'none';
      } else {
        Swal.fire('Selección requerida', 'Por favor selecciona un tono', 'warning');
      }
    });

    // Configurar cierre del modal
    modal.querySelector('.cerrar').addEventListener('click', function() {
      modal.style.display = 'none';
    });

    // Configurar vista previa ampliable
    if (imagenVistaPrevia) {
      imagenVistaPrevia.addEventListener('click', function() {
        if (!this.src || this.style.display === 'none') return;

        // Usar el nuevo sistema de modal
        imageModal.abrir([{
          src: this.src,
          alt: this.alt
        }]);
      });
    }
  }

  // Función para agregar al carrito
  function agregarAlCarrito(id, nombre, precio, tonoSeleccionado = '') {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const productoExistente = carrito.find(item => item.id === id && item.tono === tonoSeleccionado);

    if (productoExistente) {
      productoExistente.cantidad = (productoExistente.cantidad || 1) + 1;
    } else {
      carrito.push({ 
        id, 
        nombre: nombre + (tonoSeleccionado ? ` - ${tonoSeleccionado}` : ''), 
        precio: parseFloat(precio), 
        cantidad: 1, 
        tono: tonoSeleccionado,
        imagen: todosProductos.find(p => p.id === id)?.imagen || 'placeholder.jpg',
        disponible: true
      });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarrito();
    mostrarNotificacion(`¡${nombre}${tonoSeleccionado ? ' - ' + tonoSeleccionado : ''} agregado al carrito!`);
  }

  // Función para actualizar el carrito
  function actualizarCarrito() {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    let totalItems = carrito.reduce((total, item) => total + (item.cantidad || 1), 0);

    // Actualizar contador flotante
    const contadorFlotante = document.querySelector('.carrito-contador');
    const carritoFlotante = document.querySelector('.carrito-flotante');

    if (contadorFlotante && carritoFlotante) {
      contadorFlotante.textContent = totalItems;
      carritoFlotante.setAttribute('data-count', totalItems);
      contadorFlotante.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Actualizar página de carrito si existe
    if (document.getElementById('lista-carrito')) {
      const listaCarrito = document.getElementById('lista-carrito');
      const totalElement = document.getElementById('total');
      listaCarrito.innerHTML = '';

      if (carrito.length === 0) {
        listaCarrito.innerHTML = '';
        if (totalElement) totalElement.textContent = '0';
      } else {
        let total = 0;
        carrito.forEach((producto, index) => {
          const li = document.createElement('li');
          li.innerHTML = `
            <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen">
            <span class="nombre-producto">${producto.nombre}</span>
            <span class="precio-producto">$${producto.precio}</span>
            <div class="cantidad-controles">
              <button class="btn-restar" data-index="${index}">-</button>
              <span class="cantidad">${producto.cantidad}</span>
              <button class="btn-sumar" data-index="${index}">+</button>
            </div>
            <button class="btn-eliminar" data-index="${index}">
              <i class="fas fa-trash-alt"></i>
            </button>
          `;
          listaCarrito.appendChild(li);
          total += producto.precio * producto.cantidad;
        });

        if (totalElement) totalElement.textContent = total.toFixed(2);

        // Configurar botones de eliminar y controles de cantidad
        listaCarrito.addEventListener('click', (e) => {
          const index = parseInt(e.target.dataset.index);

          if (e.target.classList.contains('btn-sumar')) {
            carrito[index].cantidad++;
            localStorage.setItem('carrito', JSON.stringify(carrito));
            actualizarCarrito();
          }

          if (e.target.classList.contains('btn-restar')) {
            carrito[index].cantidad--;
            if (carrito[index].cantidad < 1) {
              carrito.splice(index, 1);
            }
            localStorage.setItem('carrito', JSON.stringify(carrito));
            actualizarCarrito();
          }

          if (e.target.classList.contains('btn-eliminar') || e.target.parentElement.classList.contains('btn-eliminar')) {
            const idx = e.target.dataset.index || e.target.parentElement.dataset.index;
            const producto = carrito[idx];
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
                carrito.splice(idx, 1);
                localStorage.setItem('carrito', JSON.stringify(carrito));
                actualizarCarrito();
                mostrarNotificacion(`${producto.nombre} eliminado del carrito`);
              }
            });
          }
        });
      }
    }
  }

  // Función para mostrar notificaciones
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

  // Sistema mejorado de modal de imagen ampliada
  class ImageModal {
    constructor() {
      this.modal = document.getElementById('modalImagen');
      this.imagen = document.getElementById('imagenAmpliada');
      this.pieImagen = document.querySelector('.pie-imagen');
      this.indicadorZoom = document.querySelector('.indicador-zoom');
      this.contadorImagen = document.querySelector('.contador-imagen');
      this.btnZoomOut = document.getElementById('btnZoomOut');
      this.btnZoomReset = document.getElementById('btnZoomReset');
      this.btnZoomIn = document.getElementById('btnZoomIn');
      this.btnPrev = document.getElementById('btnPrev');
      this.btnNext = document.getElementById('btnNext');
      this.cerrarImagen = document.querySelector('.cerrar-imagen');
      
      this.imagenes = [];
      this.imagenActual = 0;
      this.zoomActual = 1;
      this.zoomLevels = [0.5, 0.75, 1, 1.5, 2, 3, 4];
      this.zoomIndex = 2; // Comienza en 1x
      
      this.isDragging = false;
      this.startX = 0;
      this.startY = 0;
      this.translateX = 0;
      this.translateY = 0;
      
      this.init();
    }
    
    init() {
      this.setupEventListeners();
      this.setupTouchEvents();
      this.setupKeyboardEvents();
    }
    
    setupEventListeners() {
      // Botón cerrar
      this.cerrarImagen.addEventListener('click', () => this.cerrar());
      
      // Cerrar al hacer clic fuera de la imagen
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.cerrar();
      });
      
      // Controles de zoom
      this.btnZoomOut.addEventListener('click', () => this.zoomOut());
      this.btnZoomReset.addEventListener('click', () => this.zoomReset());
      this.btnZoomIn.addEventListener('click', () => this.zoomIn());
      
      // Navegación
      this.btnPrev.addEventListener('click', () => this.imagenAnterior());
      this.btnNext.addEventListener('click', () => this.siguienteImagen());
      
      // Rueda del mouse para zoom
      this.imagen.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      });
      
      // Doble clic para resetear zoom
      this.imagen.addEventListener('dblclick', () => this.zoomReset());
    }
    
    setupTouchEvents() {
      let initialDistance = 0;
      let initialScale = 1;
      let startX = 0;
      let startY = 0;
      let isSwipe = false;
      
      // Gestos táctiles para zoom y navegación
      this.imagen.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          initialDistance = this.getDistance(e.touches[0], e.touches[1]);
          initialScale = this.zoomActual;
          isSwipe = false;
        } else if (e.touches.length === 1) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          isSwipe = true;
          
          if (this.zoomActual > 1) {
            this.startDragging(startX, startY);
          }
        }
      });
      
      this.imagen.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
          const scale = (currentDistance / initialDistance) * initialScale;
          this.setZoom(Math.max(0.5, Math.min(4, scale)));
          isSwipe = false;
        } else if (e.touches.length === 1) {
          if (this.zoomActual > 1 && this.isDragging) {
            e.preventDefault();
            this.drag(e.touches[0].clientX, e.touches[0].clientY);
          }
        }
      });
      
      this.imagen.addEventListener('touchend', (e) => {
        if (isSwipe && this.zoomActual <= 1) {
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const deltaX = endX - startX;
          const deltaY = endY - startY;
          
          // Detectar swipe horizontal
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
              this.imagenAnterior();
            } else {
              this.siguienteImagen();
            }
          }
        }
        
        this.stopDragging();
      });
      
      // Gestos de swipe en el modal completo
      this.modal.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }
      });
      
      this.modal.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const deltaX = endX - startX;
          const deltaY = endY - startY;
          
          // Solo procesar si el swipe es horizontal y no se hizo en la imagen
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && 
              !e.target.closest('.contenido-imagen')) {
            if (deltaX > 0) {
              this.imagenAnterior();
            } else {
              this.siguienteImagen();
            }
          }
        }
      });
    }
    
    setupKeyboardEvents() {
      document.addEventListener('keydown', (e) => {
        if (this.modal.style.display !== 'block') return;
        
        switch(e.key) {
          case 'Escape':
            this.cerrar();
            break;
          case 'ArrowLeft':
            this.imagenAnterior();
            break;
          case 'ArrowRight':
            this.siguienteImagen();
            break;
          case '+':
          case '=':
            this.zoomIn();
            break;
          case '-':
            this.zoomOut();
            break;
          case '0':
            this.zoomReset();
            break;
        }
      });
    }
    
    getDistance(touch1, touch2) {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    
    startDragging(x, y) {
      if (this.zoomActual <= 1) return;
      this.isDragging = true;
      this.startX = x - this.translateX;
      this.startY = y - this.translateY;
      this.imagen.style.cursor = 'grabbing';
    }
    
    drag(x, y) {
      if (!this.isDragging) return;
      this.translateX = x - this.startX;
      this.translateY = y - this.startY;
      this.updateTransform();
    }
    
    stopDragging() {
      this.isDragging = false;
      this.imagen.style.cursor = 'grab';
    }
    
    setZoom(zoom) {
      this.zoomActual = zoom;
      this.updateTransform();
      this.updateIndicadorZoom();
    }
    
    updateTransform() {
      this.imagen.style.transform = `scale(${this.zoomActual}) translate(${this.translateX}px, ${this.translateY}px)`;
    }
    
    updateIndicadorZoom() {
      const porcentaje = Math.round(this.zoomActual * 100);
      this.indicadorZoom.textContent = `Zoom: ${porcentaje}%`;
      this.indicadorZoom.style.display = this.zoomActual !== 1 ? 'block' : 'none';
    }
    
    zoomIn() {
      if (this.zoomIndex < this.zoomLevels.length - 1) {
        this.zoomIndex++;
        this.setZoom(this.zoomLevels[this.zoomIndex]);
      }
    }
    
    zoomOut() {
      if (this.zoomIndex > 0) {
        this.zoomIndex--;
        this.setZoom(this.zoomLevels[this.zoomIndex]);
      }
    }
    
    zoomReset() {
      this.zoomIndex = 2; // Reset a 1x
      this.zoomActual = 1;
      this.translateX = 0;
      this.translateY = 0;
      this.updateTransform();
      this.updateIndicadorZoom();
    }
    
    abrir(imagenes, indiceInicial = 0) {
      this.imagenes = imagenes;
      this.imagenActual = indiceInicial;
      this.zoomReset();
      this.mostrarImagen();
      this.actualizarNavegacion();
      this.modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
    
    cerrar() {
      this.modal.style.display = 'none';
      document.body.style.overflow = 'auto';
      this.zoomReset();
    }
    
    mostrarImagen() {
      if (this.imagenes.length === 0) return;
      
      const imagen = this.imagenes[this.imagenActual];
      
      // Mostrar animación de carga
      this.modal.classList.add('loading');
      
      // Precargar la imagen
      const imgTemp = new Image();
      imgTemp.onload = () => {
        this.imagen.src = imagen.src;
        this.imagen.alt = imagen.alt;
        this.pieImagen.textContent = imagen.alt || '';
        this.contadorImagen.textContent = `${this.imagenActual + 1} de ${this.imagenes.length}`;
        
        // Resetear transformaciones
        this.zoomReset();
        
        // Ocultar animación de carga
        this.modal.classList.remove('loading');
      };
      
      imgTemp.onerror = () => {
        this.modal.classList.remove('loading');
        console.error('Error al cargar la imagen:', imagen.src);
      };
      
      imgTemp.src = imagen.src;
    }
    
    imagenAnterior() {
      if (this.imagenes.length <= 1) return;
      this.imagenActual = (this.imagenActual - 1 + this.imagenes.length) % this.imagenes.length;
      this.mostrarImagen();
      this.actualizarNavegacion();
    }
    
    siguienteImagen() {
      if (this.imagenes.length <= 1) return;
      this.imagenActual = (this.imagenActual + 1) % this.imagenes.length;
      this.mostrarImagen();
      this.actualizarNavegacion();
    }
    
    actualizarNavegacion() {
      const tieneMultiples = this.imagenes.length > 1;
      this.btnPrev.style.display = tieneMultiples ? 'flex' : 'none';
      this.btnNext.style.display = tieneMultiples ? 'flex' : 'none';
      this.contadorImagen.style.display = tieneMultiples ? 'block' : 'none';
    }
  }
  
  // Inicializar el modal de imagen
  const imageModal = new ImageModal();

  // Configurar botón de WhatsApp en la página de carrito
  if (document.getElementById('btn-whatsapp')) {
    document.getElementById('btn-whatsapp').addEventListener('click', function() {
      const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
      const total = document.getElementById('total')?.textContent || '0.00';

      if (carrito.length === 0) {
        mostrarNotificacion('Tu carrito está vacío');
        return;
      }

      let mensaje = '¡Hola! Quiero hacer este pedido:\n\n';
      carrito.forEach(item => {
        mensaje += `- ${item.nombre} (${item.cantidad}x): $${item.precio}\n`;
      });
      mensaje += `\nTotal: $${total}\n\nGracias!`;

      const encoded = encodeURIComponent(mensaje);
      window.open(`https://wa.me/5493735401893?text=${encoded}`, '_blank');
    });
  }

  // Función para limpiar búsqueda (debe ser global)
  window.limpiarBusqueda = function() {
    const searchInput = document.getElementById('searchInput');
    const categoriaFiltro = document.getElementById('categoriaFiltro');
    const disponibilidadFiltro = document.getElementById('disponibilidadFiltro');
    
    if (searchInput) searchInput.value = '';
    if (categoriaFiltro) categoriaFiltro.value = 'all';
    if (disponibilidadFiltro) disponibilidadFiltro.value = 'all';
    
    renderizarProductos();
  };

  // Inicializar
  cargarProductos();
  actualizarCarrito();
});
