// ===== CONFIGURACIÓN =====
const ADMIN_PASSWORD = "Jesus170385";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_llWLzIYpMB6q6gxYh_szhQscNj7tBVA3EtVn0CuNSKICyXv2kPKAoYDRHqrEZD9t/exec";

const CONFIG = {
    nombreCampo: "Casa Paraíso",
    descripcion: "Tu escapada perfecta - VTAR/CA/03260",
    descripcionLarga: "Lleva a toda la familia a este fantástico alojamiento que tiene un montón de espacio para divertirse. Paz y tranquilidad, piscina totalmente vallada para seguridad de los más pequeños. Capacidad 15 personas, 4 camas matrimonio y 7 individuales en 4 grandes habitaciones. Barbacoa, porche, cama elástica, porterias, canasta. Aparcamiento privado, buen enlace con autovía que comunica con las playas de Conil,Los Caños, Zahara, Tarifa, etc... NO SE PERMITEN CELEBRACIONES",  // ← Cambia esto
    enlace2: {
        nombre: "📍 Cómo Llegar",  // ← Cambia el texto
        url: "https://www.google.com/maps/place/36%C2%B027'55.1%22N+6%C2%B007'45.0%22W/@36.4652963,-6.1317455,17z/data=!3m1!4b1!4m4!3m3!8m2!3d36.4652963!4d-6.1291706?hl=es&entry=ttu&g_ep=EgoyMDI1MTIwMi4wIKXMDSoASAFQAw%3D%3D"  // ← Pon tu URL real
    },
    capacidad: "15 personas",
    habitaciones: 4,
    precioPorNoche: 200,
    estanciaMinima: 2,
    señalPorcentaje: 25,
    tuEmail: "vtar.paraisochiclana@gmail.com",
    datosPago: {
        titular: "Jesús Teijeiro López",
        iban: "ES33 3187 0129 1153 7491 1328",
        bizum: "+34 669 65 66 24"
    }
};

const EMAILJS_CONFIG = {
    publicKey: "2y0y0PPlq0OgBw_lo",
    serviceId: "service_b443ulg",
    templateCliente: "template_q0w947d",
    templateAdmin: "template_iv17wmi"
};

// ===== VARIABLES GLOBALES =====
let fechasBloqueadas = [];
let preciosPersonalizados = {};
let modoAdmin = false;
let mesActual = new Date();
let reservas = [];
let fechaSeleccionadaAdmin = null;
let touchTimer = null;
let fechaEntradaSeleccionada = null;
let rangoAdminInicio = null;
let rangoAdminFin = null;
let paquetesObligatorios = [];

// ===== INICIALIZACIÓN =====
emailjs.init(EMAILJS_CONFIG.publicKey);

const reservasGuardadas = localStorage.getItem('reservas');
if (reservasGuardadas) {
    reservas = JSON.parse(reservasGuardadas);
}

document.getElementById('headerNombre').textContent = CONFIG.nombreCampo;
document.getElementById('headerDescripcion').textContent = CONFIG.descripcion;
const descLarga = document.getElementById('headerDescripcionLarga');
if (descLarga) descLarga.textContent = CONFIG.descripcionLarga;

const link1 = document.getElementById('enlace1');
if (link1) {
    link1.textContent = CONFIG.enlace1.nombre;
    link1.href = CONFIG.enlace1.url;
}

const link2 = document.getElementById('enlace2');
if (link2) {
    link2.textContent = CONFIG.enlace2.nombre;
    link2.href = CONFIG.enlace2.url;
}

document.getElementById('infoCapacidad').textContent = CONFIG.capacidad;
document.getElementById('infoHabitaciones').textContent = CONFIG.habitaciones;
document.getElementById('infoPrecio').textContent = CONFIG.precioPorNoche + '€';
document.getElementById('infoEstancia').textContent = CONFIG.estanciaMinima + ' noches';
document.getElementById('infoSeñal').textContent = CONFIG.señalPorcentaje + '%';
document.getElementById('pagoTitular').textContent = CONFIG.datosPago.titular;
document.getElementById('pagoIban').textContent = CONFIG.datosPago.iban;
document.getElementById('pagoBizum').textContent = CONFIG.datosPago.bizum;
document.getElementById('footerNombre').textContent = CONFIG.nombreCampo;
document.getElementById('footerEmail').textContent = CONFIG.tuEmail;
document.getElementById('totalReservas').textContent = reservas.length;

// ===== FUNCIONES DE GOOGLE SHEETS =====

async function cargarDatosGoogle() {
    try {
        const [resFechas, resPrecios, resReservas, resPaquetes] = await Promise.all([
            fetch(GOOGLE_SCRIPT_URL + '?accion=obtenerFechasBloqueadas'),
            fetch(GOOGLE_SCRIPT_URL + '?accion=obtenerPrecios'),
            fetch(GOOGLE_SCRIPT_URL + '?accion=obtenerReservas'),
            fetch(GOOGLE_SCRIPT_URL + '?accion=obtenerPaquetesObligatorios')
        ]);
        
        const [dataFechas, dataPrecios, dataReservas, dataPaquetes] = await Promise.all([
            resFechas.json(),
            resPrecios.json(),
            resReservas.json(),
            resPaquetes.json()
        ]);
        
        if (dataFechas.success) {
            fechasBloqueadas = dataFechas.fechas || [];
            console.log('✅ Fechas bloqueadas:', fechasBloqueadas.length);
        }
        
        if (dataPrecios.success) {
            // Limpiar formato de fechas antes de usar
            const preciosBrutos = dataPrecios.precios || {};
            preciosPersonalizados = {};
            
            for (let fecha in preciosBrutos) {
                // Convertir cualquier formato de fecha a YYYY-MM-DD
                let fechaLimpia = fecha;
                
                if (fecha.includes('GMT') || fecha.includes('00:00:00')) {
                    // Es un Date string, parsearlo
                    const fechaObj = new Date(fecha);
                    const year = fechaObj.getFullYear();
                    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                    const dia = String(fechaObj.getDate()).padStart(2, '0');
                    fechaLimpia = year + '-' + mes + '-' + dia;
                }
                
                preciosPersonalizados[fechaLimpia] = preciosBrutos[fecha];
            }
            
            console.log('✅ Precios personalizados:', Object.keys(preciosPersonalizados).length);
            console.log('Ejemplo:', Object.keys(preciosPersonalizados)[0], '=', preciosPersonalizados[Object.keys(preciosPersonalizados)[0]]);
        }
        
        if (dataPaquetes.success) {
            paquetesObligatorios = dataPaquetes.paquetes || [];
            console.log('✅ Paquetes obligatorios:', paquetesObligatorios.length);
            if (modoAdmin) {
                mostrarListadoPaquetes();
            }
        }
        
        if (dataReservas.success) {
            const reservasGoogle = dataReservas.reservas || [];
            
            reservas = reservasGoogle.map((r, index) => {
                let fechaEntrada = r.fechaEntrada || '';
                let fechaSalida = r.fechaSalida || '';
                
                if (fechaEntrada.includes('T')) fechaEntrada = fechaEntrada.split('T')[0];
                if (fechaSalida.includes('T')) fechaSalida = fechaSalida.split('T')[0];
                
                return {
                    ...r,
                    fechaEntrada,
                    fechaSalida,
                    indiceLocal: index
                };
            });
            
            localStorage.setItem('reservas', JSON.stringify(reservas));
            document.getElementById('totalReservas').textContent = reservas.length;
            console.log('✅ Reservas cargadas:', reservas.length);
        }

        generarCalendario();
        
    } catch (error) {
        console.error('❌ Error al cargar:', error);
        mostrarAlerta('⚠️ Error al cargar disponibilidad', 'error');
    }
}

async function guardarFechaBloqueada(fecha) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ accion: 'bloquearFecha', fecha: fecha })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('❌ Error bloquear:', error);
        return false;
    }
}

async function eliminarFechaBloqueada(fecha) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ accion: 'desbloquearFecha', fecha: fecha })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('❌ Error desbloquear:', error);
        return false;
    }
}

async function guardarPrecioGoogle(fecha, precio) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ accion: 'guardarPrecio', fecha: fecha, precio: parseFloat(precio) })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('❌ Error precio:', error);
        return false;
    }
}

async function guardarReservaGoogle(reserva) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ accion: 'guardarReserva', ...reserva })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('❌ Error reserva:', error);
        return false;
    }
}

async function bloquearRangoGoogle(fechas) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                accion: 'bloquearRango',
                fechas: fechas,
                dni: reservas.find(r => r.fechaEntrada && fechas.includes(r.fechaEntrada.split('T')[0]))?.dni
            })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('❌ Error bloquear rango:', error);
        return false;
    }
}

async function moverReservaEliminada(reserva) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                accion: 'moverReservaEliminada',
                reserva: reserva,
                fechaEliminacion: new Date().toLocaleString('es-ES')
            })
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('❌ Error mover eliminada:', error);
        return false;
    }
}

// ===== PAQUETES OBLIGATORIOS =====

async function crearPaqueteObligatorio() {
    if (!rangoAdminInicio || !rangoAdminFin) {
        mostrarAlerta('❌ Selecciona 2 fechas primero', 'error');
        return;
    }
    
    const solapa = paquetesObligatorios.some(paq => {
        return (rangoAdminInicio >= paq.inicio && rangoAdminInicio <= paq.fin) ||
               (rangoAdminFin >= paq.inicio && rangoAdminFin <= paq.fin) ||
               (rangoAdminInicio <= paq.inicio && rangoAdminFin >= paq.fin);
    });
    
    if (solapa) {
        mostrarAlerta('❌ Se solapa con otro paquete', 'error');
        return;
    }
    
    if (!confirm(`📦 Crear paquete:\n${rangoAdminInicio} → ${rangoAdminFin}\n\nClientes deben reservar completo.`)) return;
    
    mostrarAlerta('⏳ Creando...', 'success');
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                accion: 'guardarPaqueteObligatorio',
                inicio: rangoAdminInicio,
                fin: rangoAdminFin
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            paquetesObligatorios.push({inicio: rangoAdminInicio, fin: rangoAdminFin});
            limpiarRangoAdmin();
            await cargarDatosGoogle();
            mostrarAlerta('✔ Paquete creado', 'success');
        } else {
            mostrarAlerta('❌ Error al crear', 'error');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        mostrarAlerta('❌ Error al crear', 'error');
    }
}

function mostrarListadoPaquetes() {
    const contenedor = document.getElementById('paquetesContenido');
    const listado = document.getElementById('listadoPaquetes');
    
    if (!contenedor || !listado) return;
    
    if (paquetesObligatorios.length === 0) {
        listado.style.display = 'none';
        return;
    }
    
    listado.style.display = 'block';
    contenedor.innerHTML = paquetesObligatorios.map((paq, index) => {
        return `<div style="background: white; padding: 0.8rem; margin-bottom: 0.5rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.9rem;">📦 ${paq.inicio} → ${paq.fin}</span>
            <button class="btn btn-danger" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="eliminarPaquete(${index})">🗑️</button>
        </div>`;
    }).join('');
}

async function eliminarPaquete(index) {
    const paquete = paquetesObligatorios[index];
    if (!confirm(`¿Eliminar?\n${paquete.inicio} → ${paquete.fin}`)) return;
    
    mostrarAlerta('⏳ Eliminando...', 'success');
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                accion: 'eliminarPaqueteObligatorio',
                inicio: paquete.inicio,
                fin: paquete.fin
            })
        });
        
        const data = await response.json();
        if (data.success) {
            await cargarDatosGoogle();
            mostrarAlerta('✔ Eliminado', 'success');
        } else {
            mostrarAlerta('❌ Error', 'error');
        }
    } catch (error) {
        mostrarAlerta('❌ Error', 'error');
    }
}

// ===== ADMIN - SELECCIÓN RANGO =====

function seleccionarRangoAdmin(fecha) {
    console.log('📅 Click admin:', fecha, '| Inicio:', rangoAdminInicio, 'Fin:', rangoAdminFin);
    
    if (!rangoAdminInicio) {
        rangoAdminInicio = fecha;
        rangoAdminFin = null;
        const panel = document.getElementById('panelRangoAdmin');
        if (panel) panel.style.display = 'none';
        actualizarVisualizacionRango();
        mostrarAlerta('✔ Inicio: ' + fecha + '. Selecciona fin', 'success');
    } else if (!rangoAdminFin) {
        if (fecha > rangoAdminInicio) {
            rangoAdminFin = fecha;
            const textoRango = document.getElementById('rangoTexto');
            const panel = document.getElementById('panelRangoAdmin');
            
            if (textoRango) textoRango.textContent = rangoAdminInicio + ' → ' + rangoAdminFin;
            if (panel) {
                panel.style.display = 'block';
                console.log('✅ Panel mostrado');
            }
            
            actualizarVisualizacionRango();
            mostrarAlerta('✔ Rango listo. Usa panel azul arriba ⬆️', 'success');
        } else {
            rangoAdminInicio = fecha;
            rangoAdminFin = null;
            const panel = document.getElementById('panelRangoAdmin');
            if (panel) panel.style.display = 'none';
            actualizarVisualizacionRango();
            mostrarAlerta('✔ Nuevo inicio: ' + fecha, 'success');
        }
    } else {
        rangoAdminInicio = fecha;
        rangoAdminFin = null;
        const panel = document.getElementById('panelRangoAdmin');
        if (panel) panel.style.display = 'none';
        actualizarVisualizacionRango();
        mostrarAlerta('✔ Reiniciado. Inicio: ' + fecha, 'success');
    }
}

function actualizarVisualizacionRango() {
    const calendario = document.getElementById('calendario');
    if (!calendario) return;
    
    const dias = calendario.querySelectorAll('.calendar-day');
    dias.forEach(dia => {
        const fecha = dia.dataset.fecha;
        if (!fecha) return;
        
        dia.classList.remove('selected');
        
        if (rangoAdminInicio && rangoAdminFin) {
            if (fecha >= rangoAdminInicio && fecha <= rangoAdminFin) {
                dia.classList.add('selected');
            }
        } else if (rangoAdminInicio === fecha) {
            dia.classList.add('selected');
        }
    });
}

function limpiarRangoAdmin() {
    rangoAdminInicio = null;
    rangoAdminFin = null;
    const panel = document.getElementById('panelRangoAdmin');
    if (panel) panel.style.display = 'none';
    actualizarVisualizacionRango();
    mostrarAlerta('✔ Limpiado', 'success');
}
// ===== FUNCIONES DE ADMIN =====

async function bloquearFecha() {
    mostrarAlerta('⏳ Bloqueando...', 'success');
    
    if (!fechasBloqueadas.includes(fechaSeleccionadaAdmin)) {
        const exito = await guardarFechaBloqueada(fechaSeleccionadaAdmin);
        
        if (exito) {
            fechasBloqueadas.push(fechaSeleccionadaAdmin);
            await cargarDatosGoogle();
            cerrarActionMenu();
            mostrarAlerta('✔ Bloqueada: ' + fechaSeleccionadaAdmin, 'success');
        } else {
            cerrarActionMenu();
            mostrarAlerta('❌ Error al bloquear', 'error');
        }
    } else {
        cerrarActionMenu();
        mostrarAlerta('Ya está bloqueada', 'error');
    }
}

async function desbloquearFecha() {
    const index = fechasBloqueadas.indexOf(fechaSeleccionadaAdmin);
    
    mostrarAlerta('⏳ Desbloqueando...', 'success');
    
    if (index > -1) {
        const exito = await eliminarFechaBloqueada(fechaSeleccionadaAdmin);
        
        if (exito) {
            fechasBloqueadas.splice(index, 1);
            await cargarDatosGoogle();
            cerrarActionMenu();
            mostrarAlerta('✔ Desbloqueada: ' + fechaSeleccionadaAdmin, 'success');
        } else {
            cerrarActionMenu();
            mostrarAlerta('❌ Error al desbloquear', 'error');
        }
    } else {
        cerrarActionMenu();
        mostrarAlerta('No está bloqueada', 'error');
    }
}

async function guardarPrecio() {
    const precio = document.getElementById('nuevoPrecio').value;
    
    if (!precio || precio <= 0) {
        mostrarAlerta('Precio no válido', 'error');
        return;
    }
    
    const exito = await guardarPrecioGoogle(fechaSeleccionadaAdmin, precio);
    
    if (exito) {
        preciosPersonalizados[fechaSeleccionadaAdmin] = parseFloat(precio);
        cerrarModal('modalPrecio');
        document.getElementById('nuevoPrecio').value = '';
        await cargarDatosGoogle();
        mostrarAlerta('✔ Precio: ' + precio + '€', 'success');
    } else {
        mostrarAlerta('❌ Error al guardar precio', 'error');
    }
}

async function confirmarReserva(index) {
    if (!confirm('¿Confirmar reserva? Se bloquearán las fechas.')) return;
    
    mostrarAlerta('⏳ Confirmando...', 'success');
    
    const r = reservas[index];
    const fechasABloquear = [];
    const [yearIni, mesIni, diaIni] = r.fechaEntrada.split('-').map(Number);
    const [yearFin, mesFin, diaFin] = r.fechaSalida.split('-').map(Number);
    const fechaInicio = new Date(yearIni, mesIni - 1, diaIni);
    const fechaFin = new Date(yearFin, mesFin - 1, diaFin);
    
    for (let d = new Date(fechaInicio); d < fechaFin; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        const fechaStr = year + '-' + mes + '-' + dia;
        if (!fechasBloqueadas.includes(fechaStr)) {
            fechasABloquear.push(fechaStr);
        }
    }
    
    if (fechasABloquear.length === 0) {
        mostrarAlerta('⚠️ Fechas ya bloqueadas', 'error');
        return;
    }
    
    const exito = await bloquearRangoGoogle(fechasABloquear);
    
    if (exito) {
        fechasBloqueadas.push(...fechasABloquear);
        reservas[index].confirmada = true;
        localStorage.setItem('reservas', JSON.stringify(reservas));
        await cargarDatosGoogle();
        mostrarReservas();
        mostrarAlerta('✔ Confirmada! ' + fechasABloquear.length + ' noches', 'success');
    } else {
        mostrarAlerta('❌ Error al confirmar', 'error');
    }
}

async function eliminarReserva(index) {
    if (!confirm('¿Eliminar?\nSe moverá a "Reservas Eliminadas".')) return;
    
    mostrarAlerta('⏳ Eliminando...', 'success');
    
    const r = reservas[index];
    
    if (r.confirmada) {
        let entrada = r.fechaEntrada || '';
        let salida = r.fechaSalida || '';
        
        if (entrada.includes('T')) entrada = entrada.split('T')[0];
        if (salida.includes('T')) salida = salida.split('T')[0];
        
        if (entrada && salida && entrada.length === 10 && salida.length === 10) {
            const [yearIni, mesIni, diaIni] = entrada.split('-').map(Number);
            const [yearFin, mesFin, diaFin] = salida.split('-').map(Number);
            const fechaInicio = new Date(yearIni, mesIni - 1, diaIni, 12, 0, 0);
            const fechaFin = new Date(yearFin, mesFin - 1, diaFin, 12, 0, 0);
            
            const promesas = [];
            
            let currentDate = new Date(fechaInicio);
            while (currentDate <= fechaFin) {
                const year = currentDate.getFullYear();
                const mes = String(currentDate.getMonth() + 1).padStart(2, '0');
                const dia = String(currentDate.getDate()).padStart(2, '0');
                const fechaStr = year + '-' + mes + '-' + dia;
                
                const idx = fechasBloqueadas.indexOf(fechaStr);
                if (idx > -1) {
                    fechasBloqueadas.splice(idx, 1);
                    promesas.push(eliminarFechaBloqueada(fechaStr));
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            if (promesas.length > 0) {
                await Promise.all(promesas);
            }
        }
    }
    
    await moverReservaEliminada(r);
    
    reservas.splice(index, 1);
    localStorage.setItem('reservas', JSON.stringify(reservas));
    document.getElementById('totalReservas').textContent = reservas.length;
    
    await cargarDatosGoogle();
    
    mostrarReservas();
    mostrarAlerta('✔ Eliminada y archivada', 'success');
}

// ===== VALIDACIÓN DNI =====

function validarDNI(dni) {
    const dniRegex = /^[0-9]{8}[A-Z]$/i;
    if (!dniRegex.test(dni)) return false;
    
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const numero = dni.substr(0, 8);
    const letra = dni.substr(8, 1).toUpperCase();
    
    return letras.charAt(numero % 23) === letra;
}

document.getElementById('dni').addEventListener('input', function(e) {
    const dni = e.target.value.toUpperCase();
    const validation = document.getElementById('dniValidation');
    
    if (dni.length === 0) {
        e.target.className = '';
        validation.textContent = '8 números + letra';
        validation.className = 'validation-message error';
        return;
    }
    
    if (dni.length === 9) {
        if (validarDNI(dni)) {
            e.target.className = 'valid';
            validation.textContent = '✔ Válido';
            validation.className = 'validation-message success';
        } else {
            e.target.className = 'invalid';
            validation.textContent = '✗ No válido';
            validation.className = 'validation-message error';
        }
    } else {
        e.target.className = 'invalid';
        validation.textContent = '8 números + letra';
        validation.className = 'validation-message error';
    }
});

// ===== CALENDARIO =====

function generarCalendario() {
    console.log('📅 === GENERANDO CALENDARIO ===');
    
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesTexto = meses[mes] + ' ' + año;
    
    const mesActualEl = document.getElementById('mesActual');
    if (mesActualEl) mesActualEl.textContent = mesTexto;
    
    const mesReserva = document.getElementById('mesActualReserva');
    if (mesReserva) mesReserva.textContent = mesTexto;
    
    const calendarioPrincipal = document.getElementById('calendario');
    if (calendarioPrincipal) {
        generarCalendarioEnElemento('calendario', año, mes, true);
    }
    
    const calendarioReserva = document.getElementById('calendarioReserva');
    if (calendarioReserva) {
        generarCalendarioEnElemento('calendarioReserva', año, mes, false);
    }
    
    console.log('✅ === CALENDARIO GENERADO ===');
}

function generarCalendarioEnElemento(idElemento, año, mes, permitirAdmin) {
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();
    
    const calendario = document.getElementById(idElemento);
    if (!calendario) return;
    
    calendario.innerHTML = '';
    
    const dias = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    dias.forEach(dia => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = dia;
        calendario.appendChild(header);
    });
    
    for (let i = 0; i < (primerDiaSemana === 0 ? 6 : primerDiaSemana - 1); i++) {
        calendario.appendChild(document.createElement('div'));
    }
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    for (let dia = 1; dia <= diasMes; dia++) {
        const fecha = new Date(año, mes, dia);
        const year = fecha.getFullYear();
        const mesStr = String(fecha.getMonth() + 1).padStart(2, '0');
        const diaStr = String(fecha.getDate()).padStart(2, '0');
        const fechaStr = year + '-' + mesStr + '-' + diaStr;
        
        const diaDiv = document.createElement('div');
        diaDiv.className = 'calendar-day';
        diaDiv.innerHTML = '<strong>' + dia + '</strong>';
        diaDiv.dataset.fecha = fechaStr;
        
        const esBloqueado = fechasBloqueadas.includes(fechaStr);
        
        // SIEMPRE mostrar precio (personalizado o base)
        const precioDelDia = preciosPersonalizados[fechaStr] || CONFIG.precioPorNoche;
        diaDiv.innerHTML += '<div class="precio-dia">' + precioDelDia + '€</div>';
        
        if (fecha < hoy) {
            diaDiv.classList.add('past');
        } else if (esBloqueado) {
            diaDiv.classList.add('blocked');
        } else {
            diaDiv.classList.add('available');
        }
        
        const entradaSel = document.getElementById('fechaEntrada').value;
        const salidaSel = document.getElementById('fechaSalida').value;
        
        if (entradaSel && salidaSel) {
            if (fechaStr >= entradaSel && fechaStr < salidaSel) {
                diaDiv.classList.add('selected');
            }
            if (fechaStr === salidaSel) {
                diaDiv.style.borderColor = '#ffc107';
                diaDiv.style.borderWidth = '2px';
            }
        } else if (fechaEntradaSeleccionada === fechaStr) {
            diaDiv.classList.add('selected');
        }
        
        if (modoAdmin && rangoAdminInicio && rangoAdminFin) {
            if (fechaStr >= rangoAdminInicio && fechaStr <= rangoAdminFin) {
                diaDiv.classList.add('selected');
            }
        } else if (modoAdmin && rangoAdminInicio === fechaStr) {
            diaDiv.classList.add('selected');
        }
        
        const perteneceAPaquete = paquetesObligatorios.some(paq => 
            fechaStr >= paq.inicio && fechaStr <= paq.fin
        );
        if (perteneceAPaquete && !esBloqueado) {
            diaDiv.classList.add('paquete');
        }
        
        if (fecha >= hoy) {
            if (modoAdmin && permitirAdmin && idElemento === 'calendario') {
                diaDiv.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    seleccionarRangoAdmin(fechaStr);
                });
                
                diaDiv.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    mostrarActionMenu(fechaStr);
                    return false;
                });
                
                diaDiv.addEventListener('touchstart', function() {
                    touchTimer = setTimeout(function() {
                        mostrarActionMenu(fechaStr);
                    }, 600);
                });
                
                diaDiv.addEventListener('touchend', function() {
                    clearTimeout(touchTimer);
                });
                
                diaDiv.addEventListener('touchmove', function() {
                    clearTimeout(touchTimer);
                });
                
            } else if (!esBloqueado) {
                diaDiv.addEventListener('click', function(e) {
                    e.preventDefault();
                    seleccionarFechaCliente(fechaStr);
                });
            }
        }
        
        calendario.appendChild(diaDiv);
    }
}

function cambiarMes(dir) {
    mesActual.setMonth(mesActual.getMonth() + dir);
    generarCalendario();
}

function seleccionarFechaCliente(fecha) {
    const entrada = document.getElementById('fechaEntrada');
    const salida = document.getElementById('fechaSalida');
    
    if (fechaEntradaSeleccionada === fecha && !salida.value) {
        limpiarFechas();
        mostrarAlerta('✔ Fechas limpiadas', 'success');
        return;
    }
    
    if (entrada.value && salida.value) {
        if (fecha >= entrada.value && fecha <= salida.value) {
            limpiarFechas();
            mostrarAlerta('✔ Fechas limpiadas. Selecciona de nuevo', 'success');
            return;
        }
    }
    
    const paquete = paquetesObligatorios.find(paq => fecha >= paq.inicio && fecha <= paq.fin);
    
    if (!fechaEntradaSeleccionada) {
        if (paquete) {
            entrada.value = paquete.inicio;
            salida.value = paquete.fin;
            fechaEntradaSeleccionada = paquete.inicio;
            calcularResumen();
            generarCalendario();
            mostrarAlerta('📦 Paquete seleccionado: ' + paquete.inicio + ' → ' + paquete.fin, 'success');
            return;
        }
        
        fechaEntradaSeleccionada = fecha;
        entrada.value = fecha;
        salida.value = '';
        generarCalendario();
        mostrarAlerta('✔ Entrada. Selecciona salida', 'success');
    } else {
        if (fecha > fechaEntradaSeleccionada) {
            const paqueteEnRango = paquetesObligatorios.find(paq => {
                return (fechaEntradaSeleccionada >= paq.inicio && fechaEntradaSeleccionada <= paq.fin) ||
                       (fecha >= paq.inicio && fecha <= paq.fin) ||
                       (fechaEntradaSeleccionada < paq.inicio && fecha > paq.inicio);
            });
            
            if (paqueteEnRango) {
                if (fechaEntradaSeleccionada === paqueteEnRango.inicio && fecha === paqueteEnRango.fin) {
                    salida.value = fecha;
                    calcularResumen();
                    generarCalendario();
                    mostrarAlerta('✔ Fechas seleccionadas', 'success');
                } else {
                    mostrarAlerta('❌ Paquete obligatorio (' + paqueteEnRango.inicio + ' → ' + paqueteEnRango.fin + '). Reserva completo.', 'error');
                    limpiarFechas();
                }
                return;
            }
            
            salida.value = fecha;
            calcularResumen();
            generarCalendario();
            mostrarAlerta('✔ Fechas seleccionadas', 'success');
        } else {
            entrada.value = fecha;
            salida.value = '';
            fechaEntradaSeleccionada = fecha;
            generarCalendario();
            mostrarAlerta('✔ Nueva entrada. Selecciona salida', 'success');
        }
    }
}

function limpiarFechas() {
    document.getElementById('fechaEntrada').value = '';
    document.getElementById('fechaSalida').value = '';
    document.getElementById('resumenReserva').style.display = 'none';
    fechaEntradaSeleccionada = null;
    generarCalendario();
}

function calcularResumen() {
    const entrada = document.getElementById('fechaEntrada').value;
    const salida = document.getElementById('fechaSalida').value;
    
    if (entrada && salida) {
        const [yearIni, mesIni, diaIni] = entrada.split('-').map(Number);
        const [yearFin, mesFin, diaFin] = salida.split('-').map(Number);
        const fechaEntrada = new Date(yearIni, mesIni - 1, diaIni);
        const fechaSalida = new Date(yearFin, mesFin - 1, diaFin);
        const noches = Math.round((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));
        
        if (noches < CONFIG.estanciaMinima) {
            mostrarAlerta('Mínimo ' + CONFIG.estanciaMinima + ' noches', 'error');
            document.getElementById('resumenReserva').style.display = 'none';
            return;
        }
        
        if (noches > 0) {
            let total = 0;
            for (let i = 0; i < noches; i++) {
                const fecha = new Date(yearIni, mesIni - 1, diaIni);
                fecha.setDate(fecha.getDate() + i);
                const year = fecha.getFullYear();
                const mes = String(fecha.getMonth() + 1).padStart(2, '0');
                const dia = String(fecha.getDate()).padStart(2, '0');
                const fechaStr = year + '-' + mes + '-' + dia;
                const precio = preciosPersonalizados[fechaStr] || CONFIG.precioPorNoche;
                total += parseFloat(precio);
            }
            
            const señal = (total * CONFIG.señalPorcentaje) / 100;
            
            document.getElementById('resumenReserva').style.display = 'block';
            document.getElementById('resumenNoches').textContent = noches;
            document.getElementById('resumenTotal').textContent = total.toFixed(2);
            document.getElementById('resumenSeñal').textContent = señal.toFixed(2);
        }
    }
}

// ===== UI Y MODALES =====

function mostrarActionMenu(fecha) {
    fechaSeleccionadaAdmin = fecha;
    const [year, mes, dia] = fecha.split('-').map(Number);
    const fechaObj = new Date(year, mes - 1, dia);
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {day: 'numeric', month: 'long'});
    document.getElementById('actionMenuTitle').textContent = fechaFormateada;
    document.getElementById('actionMenu').classList.add('show');
    if (navigator.vibrate) navigator.vibrate(50);
}

function cerrarActionMenu() {
    document.getElementById('actionMenu').classList.remove('show');
}

function mostrarModalPrecio() {
    cerrarActionMenu();
    const [year, mes, dia] = fechaSeleccionadaAdmin.split('-').map(Number);
    const fecha = new Date(year, mes - 1, dia);
    const fechaFormateada = fecha.toLocaleDateString('es-ES');
    document.getElementById('fechasParaPrecio').innerHTML = 
        '<p style="margin-bottom: 1rem;"><strong>Fecha:</strong> ' + fechaFormateada + '</p>';
    document.getElementById('modalPrecio').classList.add('show');
}

function mostrarLoginAdmin() {
    document.getElementById('modalLoginAdmin').classList.add('show');
}

function togglePassword() {
    const input = document.getElementById('passwordAdmin');
    const btn = event.target;
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

async function verificarPassword(event) {
    if (event) event.preventDefault();
    
    const password = document.getElementById('passwordAdmin').value;
    if (password === ADMIN_PASSWORD) {
        modoAdmin = true;
        document.body.classList.add('modo-admin');
        document.getElementById('adminPanel').classList.add('show');
        
        const seccionDisp = document.getElementById('seccionDisponibilidad');
        if (seccionDisp) seccionDisp.style.setProperty('display', 'block', 'important');
        
        const seccionReserva = document.querySelector('.section:has(#reservaForm)');
        if (seccionReserva) seccionReserva.style.setProperty('display', 'none', 'important');
        
        // Mostrar precio base en admin
        const itemPrecio = document.getElementById('itemPrecio');
        if (itemPrecio) itemPrecio.style.display = 'block';
        
        cerrarModal('modalLoginAdmin');
        document.getElementById('passwordAdmin').value = '';
        
        await cargarDatosGoogle();
        generarCalendario();
        
        mostrarAlerta('✔ Modo admin. Haz CLICK en 2 fechas para paquete', 'success');
        generarSelectorMeses();
    } else {
        mostrarAlerta('Contraseña incorrecta', 'error');
    }
}

function cerrarAdmin() {
    modoAdmin = false;
    document.body.classList.remove('modo-admin');
    document.getElementById('adminPanel').classList.remove('show');
    
    const seccionDisp = document.getElementById('seccionDisponibilidad');
    if (seccionDisp) {
        if (window.innerWidth >= 768) {
            seccionDisp.style.setProperty('display', 'none', 'important');
        } else {
            seccionDisp.style.setProperty('display', 'block', 'important');
        }
    }
    
    const seccionReserva = document.querySelector('.section:has(#reservaForm)');
    if (seccionReserva) seccionReserva.style.removeProperty('display');
    
    // Ocultar precio base al salir de admin
    const itemPrecio = document.getElementById('itemPrecio');
    if (itemPrecio) itemPrecio.style.display = 'none';
    
    generarCalendario();
    mostrarAlerta('✔ Modo cliente', 'success');
}

function mostrarReservas() {
    const listado = document.getElementById('listadoReservas');
    if (reservas.length === 0) {
        listado.innerHTML = '<p style="text-align: center; color: #999;">Sin reservas</p>';
    } else {
        listado.innerHTML = reservas.map(function(r, index) {
            const entrada = r.fechaEntrada ? r.fechaEntrada.split('T')[0] : '';
            const salida = r.fechaSalida ? r.fechaSalida.split('T')[0] : '';
            
            return '<div class="reserva-item">' +
                '<div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; align-items: center;">' +
                '<strong style="font-size: 1rem;">' + r.nombre + '</strong>' +
                (r.confirmada ? 
                    '<span style="background: #28a745; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">✔ Confirmada</span>' : 
                    '<span style="background: #ffc107; color: #333; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">⏳ Pendiente</span>') +
                '</div>' +
                '<div style="font-size: 0.85rem; line-height: 1.6;">' +
                '📋 ' + r.dni + '<br>' +
                '📧 ' + r.email + '<br>' +
                '📞 ' + r.telefono + '<br>' +
                '👥 ' + r.personas + ' personas<br>' +
                '📅 <strong>' + entrada + ' → ' + salida + '</strong> (' + r.noches + ' noches)<br>' +
                '💰 Total: <strong>' + r.total + '€</strong> | Señal: <strong>' + r.señal + '€</strong><br>' +
                (r.comentarios ? '💬 ' + r.comentarios + '<br>' : '') +
                '<small style="color: #666;">' + (r.fechaReserva || '') + '</small>' +
                '</div>' +
                '<div style="display: grid; grid-template-columns: ' + (!r.confirmada ? '1fr 1fr' : '1fr') + '; gap: 0.5rem; margin-top: 0.8rem;">' +
                (!r.confirmada ? 
                    '<button class="btn btn-success" style="padding: 0.7rem; font-size: 0.85rem;" onclick="confirmarReserva(' + index + ')">✔ Confirmar</button>' : 
                    '') +
                '<button class="btn btn-danger" style="padding: 0.7rem; font-size: 0.85rem;" onclick="eliminarReserva(' + index + ')">🗑️</button>' +
                '</div>' +
                '</div>';
        }).join('');
    }
    document.getElementById('modalReservas').classList.add('show');
}

function descargarReservas() {
    if (reservas.length === 0) {
        mostrarAlerta('No hay reservas', 'error');
        return;
    }
    
    let csv = 'Fecha,Nombre,DNI,Email,Telefono,Personas,Entrada,Salida,Noches,Total,Señal,Estado,Comentarios\n';
    reservas.forEach(function(r) {
        csv += '"' + r.fechaReserva + '","' + r.nombre + '","' + r.dni + '","' + r.email + '","' + r.telefono + '",' + r.personas + ',"' + r.fechaEntrada + '","' + r.fechaSalida + '",' + r.noches + ',' + r.total + ',' + r.señal + ',"' + (r.confirmada ? 'Confirmada' : 'Pendiente') + '","' + (r.comentarios || '') + '"\n';
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'reservas_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
    
    mostrarAlerta('✔ Descargado', 'success');
}

function cerrarModal(id) {
    document.getElementById(id).classList.remove('show');
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
    if (event.target.id === 'actionMenu') {
        cerrarActionMenu();
    }
}

function verImagenGrande(src) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    modal.onclick = () => modal.remove();
    
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:100%;max-height:100%;border-radius:8px;';
    
    modal.appendChild(img);
    document.body.appendChild(modal);
}

function mostrarAlerta(mensaje, tipo) {
    const container = document.getElementById('alertContainer');
    container.innerHTML = '<div class="alert ' + tipo + ' show">' + mensaje + '</div>';
    setTimeout(function() {
        container.innerHTML = '';
    }, 4000);
}

// ===== ENVIAR RESERVA =====

document.getElementById('reservaForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const dniInput = document.getElementById('dni');
    if (!validarDNI(dniInput.value)) {
        mostrarAlerta('DNI no válido', 'error');
        dniInput.focus();
        return;
    }
    
    const btnEnviar = document.getElementById('btnEnviar');
    const loader = document.getElementById('loader');
    
    btnEnviar.disabled = true;
    loader.style.display = 'block';
    
    try {
        const reserva = {
            fechaReserva: new Date().toLocaleString('es-ES'),
            nombre: document.getElementById('nombre').value,
            dni: dniInput.value.toUpperCase(),
            email: document.getElementById('email').value,
            telefono: document.getElementById('telefono').value,
            personas: document.getElementById('personas').value,
            fechaEntrada: document.getElementById('fechaEntrada').value,
            fechaSalida: document.getElementById('fechaSalida').value,
            noches: document.getElementById('resumenNoches').textContent,
            total: document.getElementById('resumenTotal').textContent,
            señal: document.getElementById('resumenSeñal').textContent,
            comentarios: document.getElementById('comentarios').value,
            nombreCampo: CONFIG.nombreCampo,
            confirmada: false
        };
        
        const exitoGoogle = await guardarReservaGoogle(reserva);
        
        if (!exitoGoogle) {
            throw new Error('Error al guardar en Google Sheets');
        }
        
        await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateCliente,
            {
                to_email: reserva.email,
                to_name: reserva.nombre,
                nombre: reserva.nombre,
                dni: reserva.dni,
                email: reserva.email,
                telefono: reserva.telefono,
                personas: reserva.personas,
                fechaEntrada: reserva.fechaEntrada,
                fechaSalida: reserva.fechaSalida,
                noches: reserva.noches,
                total: reserva.total,
                señal: reserva.señal,
                comentarios: reserva.comentarios
            }
        );
        
        await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateAdmin,
            {
                to_email: CONFIG.tuEmail,
                nombre: reserva.nombre,
                dni: reserva.dni,
                email: reserva.email,
                telefono: reserva.telefono,
                personas: reserva.personas,
                fechaEntrada: reserva.fechaEntrada,
                fechaSalida: reserva.fechaSalida,
                noches: reserva.noches,
                total: reserva.total,
                señal: reserva.señal,
                comentarios: reserva.comentarios
            }
        );
        
        reservas.push(reserva);
        localStorage.setItem('reservas', JSON.stringify(reservas));
        document.getElementById('totalReservas').textContent = reservas.length;
        
        document.getElementById('reservaForm').reset();
        document.getElementById('resumenReserva').style.display = 'none';
        fechaEntradaSeleccionada = null;
        generarCalendario();
        
        document.getElementById('emailConfirmacion').textContent = CONFIG.tuEmail;
        document.getElementById('modalConfirmacion').classList.add('show');
        
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('❌ Error al enviar. Inténtalo de nuevo.', 'error');
    } finally {
        btnEnviar.disabled = false;
        loader.style.display = 'none';
    }
});

// ===== CARGAR AL INICIO =====
window.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Página cargada');
    console.log('🔗 Google Script:', GOOGLE_SCRIPT_URL);
    cargarDatosGoogle();
});
// ===== BLOQUEO DE MESES COMPLETOS =====

function generarSelectorMeses() {
    const selector = document.getElementById('selectorMesBloqueo');
    if (!selector) return;
    
    const hoy = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    selector.innerHTML = '';
    
    // Generar opciones para los próximos 24 meses
    for (let i = 0; i < 24; i++) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
        const mes = fecha.getMonth();
        const año = fecha.getFullYear();
        
        const option = document.createElement('option');
        option.value = año + '-' + String(mes + 1).padStart(2, '0');
        option.textContent = meses[mes] + ' ' + año;
        
        selector.appendChild(option);
    }
}

async function cerrarMesCompleto() {
    const selector = document.getElementById('selectorMesBloqueo');
    if (!selector || !selector.value) return;
    
    const [año, mes] = selector.value.split('-').map(Number);
    const mesTexto = selector.options[selector.selectedIndex].text;
    
    if (!confirm('🔒 ¿Cerrar TODO ' + mesTexto + '?\n\nSe bloquearán TODOS los días del mes.')) return;
    
    mostrarAlerta('⏳ Cerrando ' + mesTexto + '...', 'success');
    
    // Calcular todos los días del mes
    const primerDia = new Date(año, mes - 1, 1);
    const ultimoDia = new Date(año, mes, 0);
    const diasDelMes = ultimoDia.getDate();
    
    const fechasABloquear = [];
    
    for (let dia = 1; dia <= diasDelMes; dia++) {
        const fechaStr = año + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
        
        // Solo añadir si no está ya bloqueada
        if (!fechasBloqueadas.includes(fechaStr)) {
            fechasABloquear.push(fechaStr);
        }
    }
    
    if (fechasABloquear.length === 0) {
        mostrarAlerta('✔ Ya está cerrado', 'success');
        return;
    }
    
    // Guardar todas las fechas en Google Sheets
    const promesas = fechasABloquear.map(fecha => guardarFechaBloqueada(fecha));
    const resultados = await Promise.all(promesas);
    
    const exitosos = resultados.filter(r => r).length;
    
    if (exitosos > 0) {
        fechasBloqueadas.push(...fechasABloquear);
        await cargarDatosGoogle();
        mostrarAlerta('✔ Cerrado: ' + mesTexto + ' (' + exitosos + ' días)', 'success');
    } else {
        mostrarAlerta('❌ Error al cerrar mes', 'error');
    }
}

async function abrirMesCompleto() {
    const selector = document.getElementById('selectorMesBloqueo');
    if (!selector || !selector.value) return;
    
    const [año, mes] = selector.value.split('-').map(Number);
    const mesTexto = selector.options[selector.selectedIndex].text;
    
    if (!confirm('🔓 ¿Abrir TODO ' + mesTexto + '?\n\nSe desbloquearán TODOS los días del mes (excepto reservas confirmadas).')) return;
    
    mostrarAlerta('⏳ Abriendo ' + mesTexto + '...', 'success');
    
    // Calcular todos los días del mes
    const primerDia = new Date(año, mes - 1, 1);
    const ultimoDia = new Date(año, mes, 0);
    const diasDelMes = ultimoDia.getDate();
    
    const fechasADesbloquear = [];
    
    for (let dia = 1; dia <= diasDelMes; dia++) {
        const fechaStr = año + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
        
        // Solo desbloquear si está bloqueada y no es de una reserva
        const esReserva = reservas.some(r => {
            if (!r.confirmada) return false;
            const entrada = r.fechaEntrada.split('T')[0];
            const salida = r.fechaSalida.split('T')[0];
            return fechaStr >= entrada && fechaStr < salida;
        });
        
        if (fechasBloqueadas.includes(fechaStr) && !esReserva) {
            fechasADesbloquear.push(fechaStr);
        }
    }
    
    if (fechasADesbloquear.length === 0) {
        mostrarAlerta('✔ No hay días para abrir', 'success');
        return;
    }
    
    // Eliminar todas las fechas de Google Sheets
    const promesas = fechasADesbloquear.map(fecha => eliminarFechaBloqueada(fecha));
    const resultados = await Promise.all(promesas);
    
    const exitosos = resultados.filter(r => r).length;
    
    if (exitosos > 0) {
        fechasADesbloquear.forEach(fecha => {
            const index = fechasBloqueadas.indexOf(fecha);
            if (index > -1) fechasBloqueadas.splice(index, 1);
        });
        await cargarDatosGoogle();
        mostrarAlerta('✔ Abierto: ' + mesTexto + ' (' + exitosos + ' días)', 'success');
    } else {
        mostrarAlerta('❌ Error al abrir mes', 'error');
    }
}

console.log('✅ Sistema inicializado');
