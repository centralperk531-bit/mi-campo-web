// ===== CONFIGURACIÓN =====
const ADMIN_PASSWORD = "micampo2025";

// 🔥 CAMBIA ESTA URL POR LA TUYA
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby_llWLzIYpMB6q6gxYh_szhQscNj7tBVA3EtVn0CuNSKICyXv2kPKAoYDRHqrEZD9t/exec";

const CONFIG = {
    nombreCampo: "Casa Paraíso",
    descripcion: "Tu escapada perfecta",
    capacidad: "15 personas",
    precioPorNoche: 200,
    estanciaMinima: 2,
    señalPorcentaje: 20,
    tuEmail: "centralperk.531@gmail.com",
    datosPago: {
        titular: "Tu Nombre",
        iban: "ES00 0000 0000 0000 0000 0000",
        bizum: "600 123 456"
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

// ===== INICIALIZACIÓN =====
emailjs.init(EMAILJS_CONFIG.publicKey);

const reservasGuardadas = localStorage.getItem('reservas');
if (reservasGuardadas) {
    reservas = JSON.parse(reservasGuardadas);
}

document.getElementById('headerNombre').textContent = CONFIG.nombreCampo;
document.getElementById('headerDescripcion').textContent = CONFIG.descripcion;
document.getElementById('infoCapacidad').textContent = CONFIG.capacidad;
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
        const [resFechas, resPrecios, resReservas] = await Promise.all([
            fetch(GOOGLE_SCRIPT_URL + '?accion=obtenerFechasBloqueadas'),
            fetch(GOOGLE_SCRIPT_URL + '?accion=obtenerPrecios'),
            fetch(GOOGLE_SCRIPT_URL + '?accion=obtenerReservas')
        ]);
        
        const [dataFechas, dataPrecios, dataReservas] = await Promise.all([
            resFechas.json(),
            resPrecios.json(),
            resReservas.json()
        ]);
        
        if (dataFechas.success) {
            fechasBloqueadas = dataFechas.fechas || [];
            console.log('✅ Fechas bloqueadas:', fechasBloqueadas.length);
        }
        
        if (dataPrecios.success) {
            preciosPersonalizados = dataPrecios.precios || {};
            console.log('✅ Precios personalizados:', Object.keys(preciosPersonalizados).length);
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
        console.log('🔒 Bloqueando fecha:', fecha);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
                accion: 'bloquearFecha',
                fecha: fecha
            })
        });
        
        const data = await response.json();
        console.log('📥 Respuesta bloquear:', data);
        return data.success;
    } catch (error) {
        console.error('❌ Error bloquear:', error);
        return false;
    }
}

async function eliminarFechaBloqueada(fecha) {
    try {
        console.log('🔓 Desbloqueando fecha:', fecha);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
                accion: 'desbloquearFecha',
                fecha: fecha
            })
        });
        
        const data = await response.json();
        console.log('📥 Respuesta desbloquear:', data);
        return data.success;
    } catch (error) {
        console.error('❌ Error desbloquear:', error);
        return false;
    }
}

async function guardarPrecioGoogle(fecha, precio) {
    try {
        console.log('💰 Guardando precio:', fecha, precio);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
                accion: 'guardarPrecio',
                fecha: fecha,
                precio: parseFloat(precio)
            })
        });
        
        const data = await response.json();
        console.log('📥 Respuesta precio:', data);
        return data.success;
    } catch (error) {
        console.error('❌ Error precio:', error);
        return false;
    }
}

async function guardarReservaGoogle(reserva) {
    try {
        console.log('📝 Guardando reserva:', reserva);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
                accion: 'guardarReserva',
                ...reserva
            })
        });
        
        const data = await response.json();
        console.log('📥 Respuesta reserva:', data);
        return data.success;
    } catch (error) {
        console.error('❌ Error reserva:', error);
        return false;
    }
}

async function bloquearRangoGoogle(fechas) {
    try {
        console.log('🔒 Bloqueando rango de', fechas.length, 'fechas:', fechas);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
                accion: 'bloquearRango',
                fechas: fechas,
                dni: reservas.find(r => r.fechaEntrada && fechas.includes(r.fechaEntrada.split('T')[0]))?.dni
            })
        });
        
        const data = await response.json();
        console.log('📥 Respuesta bloquear rango:', data);
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
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
                accion: 'moverReservaEliminada',
                reserva: reserva,
                fechaEliminacion: new Date().toLocaleString('es-ES')
            })
        });
        
        const data = await response.json();
        console.log('📥 Respuesta mover eliminada:', data);
        return data.success;
    } catch (error) {
        console.error('❌ Error mover eliminada:', error);
        return false;
    }
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
            mostrarAlerta('✔ Fecha bloqueada: ' + fechaSeleccionadaAdmin, 'success');
        } else {
            cerrarActionMenu();
            mostrarAlerta('❌ Error al bloquear. Revisa la consola (F12)', 'error');
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
            mostrarAlerta('✔ Fecha desbloqueada: ' + fechaSeleccionadaAdmin, 'success');
        } else {
            cerrarActionMenu();
            mostrarAlerta('❌ Error al desbloquear. Revisa la consola (F12)', 'error');
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
    
    mostrarAlerta('⏳ Confirmando y bloqueando...', 'success');
    
    const r = reservas[index];
    
    const fechasABloquear = [];
    const [yearIni, mesIni, diaIni] = r.fechaEntrada.split('-').map(Number);
    const [yearFin, mesFin, diaFin] = r.fechaSalida.split('-').map(Number);
    const fechaInicio = new Date(yearIni, mesIni - 1, diaIni);
    const fechaFin = new Date(yearFin, mesFin - 1, diaFin);
    
    console.log('📅 Bloqueando desde', r.fechaEntrada, 'hasta', r.fechaSalida);
    
    for (let d = new Date(fechaInicio); d < fechaFin; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        const fechaStr = year + '-' + mes + '-' + dia;
        if (!fechasBloqueadas.includes(fechaStr)) {
            fechasABloquear.push(fechaStr);
        }
    }
    
    console.log('📋 Fechas a bloquear:', fechasABloquear);
    
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
        mostrarAlerta('✔ Confirmada! Bloqueadas ' + fechasABloquear.length + ' noches', 'success');
    } else {
        mostrarAlerta('❌ Error al confirmar. Revisa la consola (F12)', 'error');
    }
}

async function eliminarReserva(index) {
    if (!confirm('¿Eliminar esta reserva?\n\nSe moverá a "Reservas Eliminadas" y podrás recuperarla después si es necesario.')) return;
    
    console.log('=== INICIO ELIMINACIÓN ===');
    console.log('Index:', index);
    console.log('Reserva:', reservas[index]);
    
    mostrarAlerta('⏳ Eliminando...', 'success');
    
    const r = reservas[index];
    
    if (r.confirmada) {
        console.log('🔓 Desbloqueando fechas de reserva confirmada...');
        
        let entrada = r.fechaEntrada || '';
        let salida = r.fechaSalida || '';
        
        if (entrada.includes('T')) entrada = entrada.split('T')[0];
        if (salida.includes('T')) salida = salida.split('T')[0];
        
        console.log('Fechas a desbloquear:', entrada, '→', salida);
        
        if (entrada && salida && entrada.length === 10 && salida.length === 10) {
            const [yearIni, mesIni, diaIni] = entrada.split('-').map(Number);
            const [yearFin, mesFin, diaFin] = salida.split('-').map(Number);
            const fechaInicio = new Date(yearIni, mesIni - 1, diaIni, 12, 0, 0);
            const fechaFin = new Date(yearFin, mesFin - 1, diaFin, 12, 0, 0);
            
            const promesas = [];
            let desbloqueadas = 0;
            
            let currentDate = new Date(fechaInicio);
            while (currentDate <= fechaFin) {
                const year = currentDate.getFullYear();
                const mes = String(currentDate.getMonth() + 1).padStart(2, '0');
                const dia = String(currentDate.getDate()).padStart(2, '0');
                const fechaStr = year + '-' + mes + '-' + dia;
                
                const idx = fechasBloqueadas.indexOf(fechaStr);
                if (idx > -1) {
                    console.log('Desbloqueando:', fechaStr);
                    fechasBloqueadas.splice(idx, 1);
                    promesas.push(eliminarFechaBloqueada(fechaStr));
                    desbloqueadas++;
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            console.log('Total a desbloquear:', desbloqueadas);
            
            if (promesas.length > 0) {
                console.log('Esperando promesas...');
                await Promise.all(promesas);
                console.log('✅ Fechas desbloqueadas');
            }
        }
    }
    
    console.log('📦 Moviendo a Reservas Eliminadas...');
    const eliminadaExito = await moverReservaEliminada(r);
    
    if (eliminadaExito) {
        console.log('✅ Movida a eliminadas');
    } else {
        console.warn('⚠️ No se pudo mover a eliminadas, pero continuamos');
    }
    
    console.log('Eliminando de array local...');
    reservas.splice(index, 1);
    localStorage.setItem('reservas', JSON.stringify(reservas));
    document.getElementById('totalReservas').textContent = reservas.length;
    
    console.log('🔄 Recargando datos...');
    await cargarDatosGoogle();
    
    mostrarReservas();
    mostrarAlerta('✔ Reserva eliminada y archivada', 'success');
    
    console.log('=== FIN ELIMINACIÓN ===');
}

// ===== FUNCIONES DE VALIDACIÓN =====

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

// ===== FUNCIONES DE CALENDARIO =====

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
    
    if (!calendario) {
        console.error('❌ No se encuentra elemento #' + idElemento);
        return;
    }
    
    calendario.innerHTML = '';
    
    const dias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    dias.forEach(dia => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = dia;
        calendario.appendChild(header);
    });
    
    for (let i = 0; i < primerDiaSemana; i++) {
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
        const precioPersonalizado = preciosPersonalizados[fechaStr];
        
        if (precioPersonalizado) {
            diaDiv.innerHTML += '<div class="precio-dia">' + precioPersonalizado + '€</div>';
        }
        
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
        
        if (fecha >= hoy) {
            if (modoAdmin && permitirAdmin && idElemento === 'calendario') {
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
    
    if (!fechaEntradaSeleccionada) {
        fechaEntradaSeleccionada = fecha;
        entrada.value = fecha;
        salida.value = '';
        generarCalendario();
        mostrarAlerta('✔ Entrada seleccionada. Ahora selecciona salida', 'success');
    } else {
        if (fecha > fechaEntradaSeleccionada) {
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

// ===== FUNCIONES DE MODALES Y UI =====

function mostrarActionMenu(fecha) {
    fechaSeleccionadaAdmin = fecha;
    const [year, mes, dia] = fecha.split('-').map(Number);
    const fechaObj = new Date(year, mes - 1, dia);
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {day: 'numeric', month: 'long'});
    document.getElementById('actionMenuTitle').textContent = fechaFormateada;
    document.getElementById('actionMenu').classList.add('show');
    
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
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
        document.getElementById('adminPanel').classList.add('show');
        
        const seccionDisp = document.getElementById('seccionDisponibilidad');
        if (seccionDisp) {
            seccionDisp.style.display = 'block';
            seccionDisp.style.removeProperty('display');
        }
        
        document.body.classList.add('modo-admin');
        
        cerrarModal('modalLoginAdmin');
        document.getElementById('passwordAdmin').value = '';
        
        await cargarDatosGoogle();
        
        generarCalendario();
        mostrarAlerta('✔ Modo admin activado. Usa botón derecho en el calendario.', 'success');
    } else {
        mostrarAlerta('Contraseña incorrecta', 'error');
    }
}

function cerrarAdmin() {
    modoAdmin = false;
    document.getElementById('adminPanel').classList.remove('show');
    document.body.classList.remove('modo-admin');
    
    const seccionDisp = document.getElementById('seccionDisponibilidad');
    if (seccionDisp && window.innerWidth >= 768) {
        seccionDisp.style.display = 'none';
    }
    
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
                    '<button class="btn btn-success" style="padding: 0.7rem; font-size: 0.85rem;" onclick="confirmarReserva(' + index + ')">✔ Confirmar y Bloquear</button>' : 
                    '') +
                '<button class="btn btn-danger" style="padding: 0.7rem; font-size: 0.85rem;" onclick="eliminarReserva(' + index + ')">🗑️ Eliminar</button>' +
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
    console.log('🚀 Página cargada, iniciando...');
    console.log('🔗 URL de Google Script:', GOOGLE_SCRIPT_URL);
    console.log('⚠️ Si ves errores de CORS, debes:');
    console.log('   1. Ir a Apps Script');
    console.log('   2. Implementar → Administrar implementaciones');
    console.log('   3. Clic en ✏️ lápiz');
    console.log('   4. Cambiar "Versión" a "Nueva versión"');
    console.log('   5. Implementar');
    console.log('   6. Esperar 20 segundos');
    console.log('   7. Refrescar esta página');
    cargarDatosGoogle();
});

console.log('✅ Sistema inicializado');
