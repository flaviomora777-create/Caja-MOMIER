import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  DollarSign,
  CreditCard,
  FileText,
  Settings,
  LogIn,
  AlertCircle,
  Calendar,
  PiggyBank,
  CheckSquare,
  ArrowRightLeft,
  Download,
  ShieldCheck,
  HeartHandshake,
  LogOut,
  CheckCircle,
  BookOpen,
  Mail,
  Paperclip,
  Clock,
  Edit,
  List,
  Send,
  Fingerprint,
} from "lucide-react";

export default function App() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
  }, []);

  // --- Estados de Sesión ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("");
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");
  const [toast, setToast] = useState("");
  const [escaneandoHuella, setEscaneandoHuella] = useState(false);

  // Modales de Alertas e Interacciones
  const [modalBienvenida, setModalBienvenida] = useState(null);
  const [modalCorreoCredito, setModalCorreoCredito] = useState(null);
  const [socioEdicion, setSocioEdicion] = useState(null);
  const [modalEstadoCuenta, setModalEstadoCuenta] = useState(null);

  // --- Base de Datos Contable ---
  const [config, setConfig] = useState({
    diasAhorro: 5,
    diasCuota: 3,
    maxSocios: 30,
  });
  const [socios, setSocios] = useState([]);
  const [ahorros, setAhorros] = useState([]);
  const [creditos, setCreditos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [transferencias, setTransferencias] = useState([]);

  const hoyString = new Date().toISOString().split("T")[0];

  // --- Formularios ---
  const [nuevoSocio, setNuevoSocio] = useState({
    nombre: "",
    cedula: "",
    correo: "",
    aporteInicial: "",
    fechaIngreso: hoyString,
    comprobante: null,
  });
  const [nuevoAhorro, setNuevoAhorro] = useState({
    socioId: "",
    monto: "",
    fecha: hoyString,
    comprobante: null,
  });
  const [simulador, setSimulador] = useState({
    socioId: "",
    monto: "",
    tasa: "",
    meses: "",
    fechaOtorgamiento: hoyString,
  });
  const [tablaAmortizacion, setTablaAmortizacion] = useState([]);
  const [fechaCobroEfectivo, setFechaCobroEfectivo] = useState(hoyString);
  const [nuevaTransferencia, setNuevaTransferencia] = useState({
    paraSocioId: "",
    monto: "",
    fecha: hoyString,
  });
  const [comprobantesCobro, setComprobantesCobro] = useState({});

  const mostrarNotificacion = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr || typeof fechaStr !== "string") return "-";
    const partes = fechaStr.split("-");
    return partes.length === 3
      ? `${partes[2]}/${partes[1]}/${partes[0]}`
      : fechaStr;
  };

  const agregarMeses = (fechaBase, mesesAAgregar) => {
    if (!fechaBase) return hoyString;
    const fecha = new Date(fechaBase + "T00:00:00");
    fecha.setMonth(fecha.getMonth() + mesesAAgregar);
    return fecha.toISOString().split("T")[0];
  };

  const nombreMes = (fechaStr) => {
    if (!fechaStr) return "";
    const date = new Date(fechaStr + "T00:00:00");
    return new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" })
      .format(date)
      .toUpperCase();
  };

  // --- Autenticación Estándar y Biométrica ---
  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (password === "admin123") {
      setIsAuthenticated(true);
      setRol("admin");
      setActiveTab("resumen");
    } else {
      const socioEncontrado = socios.find((s) => s.cedula === password);
      if (socioEncontrado) {
        // Guarda el dispositivo para futuros ingresos con huella
        localStorage.setItem("momier_biometric_cedula", socioEncontrado.cedula);
        setIsAuthenticated(true);
        setRol("socio");
        setUsuarioActual(socioEncontrado);
        setActiveTab("mi_billetera");
      } else {
        mostrarNotificacion(
          "Credenciales incorrectas. Pruebe admin123 o cédula de socio."
        );
      }
    }
  };

  const loginBiometrico = () => {
    const savedCedula = localStorage.getItem("momier_biometric_cedula");
    if (!savedCedula) {
      return mostrarNotificacion(
        "Dispositivo no reconocido. Ingrese con su cédula primero."
      );
    }

    setEscaneandoHuella(true);
    setTimeout(() => {
      setEscaneandoHuella(false);
      const socioEncontrado = socios.find((s) => s.cedula === savedCedula);
      if (socioEncontrado) {
        setIsAuthenticated(true);
        setRol("socio");
        setUsuarioActual(socioEncontrado);
        setActiveTab("mi_billetera");
        mostrarNotificacion("Identidad verificada exitosamente");
      } else {
        mostrarNotificacion("Socio no encontrado en la base de datos.");
      }
    }, 1500); // Simula el tiempo de lectura del sensor
  };

  const cerrarSesion = () => {
    setIsAuthenticated(false);
    setRol("");
    setUsuarioActual(null);
    setPassword("");
  };

  const calcularAhorroNetoSocio = (idSocio) => {
    let balance = 0;
    for (let i = 0; i < ahorros.length; i++) {
      if (ahorros[i].socioId === idSocio)
        balance += parseFloat(ahorros[i].monto) || 0;
    }
    for (let i = 0; i < transferencias.length; i++) {
      if (transferencias[i].paraSocioId === idSocio)
        balance += parseFloat(transferencias[i].monto) || 0;
      if (transferencias[i].deSocioId === idSocio)
        balance -= parseFloat(transferencias[i].monto) || 0;
    }
    return balance;
  };

  const balancesGlobales = useMemo(() => {
    let fondo = 0;
    let prestado = 0;
    for (let i = 0; i < ahorros.length; i++)
      fondo += parseFloat(ahorros[i].monto) || 0;
    for (let i = 0; i < pagos.length; i++) {
      fondo += parseFloat(pagos[i].interes) || 0;
      prestado -= parseFloat(pagos[i].capital) || 0;
    }
    for (let i = 0; i < creditos.length; i++)
      prestado += parseFloat(creditos[i].monto) || 0;
    return {
      fondoTotal: fondo,
      capitalPrestado: prestado,
      disponibleParaPrestar: fondo - prestado,
    };
  }, [ahorros, pagos, creditos]);

  // --- Procesos Administrativos ---
  const guardarSocio = (e) => {
    e.preventDefault();
    if (socios.length >= config.maxSocios)
      return mostrarNotificacion("Límite de socios alcanzado");
    const idSocio = `soc-${Date.now()}`;
    const socioCreado = {
      id: idSocio,
      nombre: nuevoSocio.nombre.trim(),
      cedula: nuevoSocio.cedula.trim(),
      correo: nuevoSocio.correo.trim(),
      fechaIngreso: nuevoSocio.fechaIngreso,
    };
    const montoInicial = parseFloat(nuevoSocio.aporteInicial) || 0;
    if (montoInicial > 0)
      setAhorros((prev) => [
        ...prev,
        {
          id: `ahr-${Date.now()}`,
          socioId: idSocio,
          monto: montoInicial,
          fecha: nuevoSocio.fechaIngreso,
          detalle: "Aporte Inicial",
          comprobante: nuevoSocio.comprobante,
        },
      ]);
    setSocios((prev) => [...prev, socioCreado]);
    setModalBienvenida(socioCreado);
    setNuevoSocio({
      nombre: "",
      cedula: "",
      correo: "",
      aporteInicial: "",
      fechaIngreso: hoyString,
      comprobante: null,
    });
    if (document.getElementById("fileUploadSocio"))
      document.getElementById("fileUploadSocio").value = "";
  };

  const guardarEdicionSocio = (e) => {
    e.preventDefault();
    setSocios((prev) =>
      prev.map((s) => (s.id === socioEdicion.id ? socioEdicion : s))
    );
    setSocioEdicion(null);
    mostrarNotificacion("Datos del socio actualizados");
  };

  const registrarAhorro = (e) => {
    e.preventDefault();
    const montoIngresado = parseFloat(nuevoAhorro.monto) || 0;
    if (!nuevoAhorro.socioId || montoIngresado <= 0)
      return mostrarNotificacion("Datos inválidos");
    setAhorros((prev) => [
      ...prev,
      {
        id: `ahr-${Date.now()}`,
        socioId: nuevoAhorro.socioId,
        monto: montoIngresado,
        fecha: nuevoAhorro.fecha,
        detalle: "Aporte Ordinario",
        comprobante: nuevoAhorro.comprobante,
      },
    ]);
    setNuevoAhorro({
      socioId: "",
      monto: "",
      fecha: hoyString,
      comprobante: null,
    });
    if (document.getElementById("fileUploadAhorro"))
      document.getElementById("fileUploadAhorro").value = "";
    mostrarNotificacion("Depósito registrado");
  };

  const calcularAmortizacion = () => {
    const m = parseFloat(simulador.monto) || 0;
    const t = parseFloat(simulador.tasa) || 0;
    const n = parseInt(simulador.meses) || 0;
    if (m <= 0 || t <= 0 || n <= 0)
      return mostrarNotificacion("Ingrese valores válidos");
    if (m > balancesGlobales.disponibleParaPrestar)
      return mostrarNotificacion("Caja sin fondos suficientes");
    const r = t / 100;
    const cuotaFija = (m * r) / (1 - Math.pow(1 + r, -n));
    let saldo = m;
    let tabla = [];
    for (let i = 1; i <= n; i++) {
      const interes = saldo * r;
      let capital = cuotaFija - interes;
      if (i === n) capital = saldo;
      saldo -= capital;
      tabla.push({
        mes: i,
        cuota: (capital + interes).toFixed(2),
        capital: capital.toFixed(2),
        interes: interes.toFixed(2),
        saldo: Math.max(0, saldo).toFixed(2),
        fechaVencimiento: agregarMeses(simulador.fechaOtorgamiento, i),
      });
    }
    setTablaAmortizacion(tabla);
  };

  const aprobarCredito = () => {
    if (tablaAmortizacion.length === 0 || !simulador.socioId)
      return mostrarNotificacion("Simule la tabla primero");
    const socioResponsable = socios.find((s) => s.id === simulador.socioId);
    setCreditos((prev) => [
      ...prev,
      {
        id: `crd-${Date.now()}`,
        socioId: simulador.socioId,
        monto: parseFloat(simulador.monto),
        tasa: parseFloat(simulador.tasa),
        meses: simulador.meses,
        tabla: tablaAmortizacion,
        cuotasPagadas: 0,
        fechaAprobacion: simulador.fechaOtorgamiento,
      },
    ]);
    setModalCorreoCredito({
      nombre: socioResponsable.nombre,
      correo: socioResponsable.correo,
      monto: parseFloat(simulador.monto).toFixed(2),
    });
    setTablaAmortizacion([]);
    setSimulador({
      socioId: "",
      monto: "",
      tasa: "",
      meses: "",
      fechaOtorgamiento: hoyString,
    });
  };

  const registrarCobroCuota = (credito) => {
    const mesACobrar = credito.cuotasPagadas + 1;
    if (mesACobrar > parseInt(credito.meses))
      return mostrarNotificacion("Contrato cancelado");
    const detalleCuota = credito.tabla[mesACobrar - 1];
    const comprobanteSubido = comprobantesCobro[credito.id] || null;
    setPagos((prev) => [
      ...prev,
      {
        id: `pag-${Date.now()}`,
        creditoId: credito.id,
        socioId: credito.socioId,
        mes: mesACobrar,
        montoTotal: parseFloat(detalleCuota.cuota),
        capital: parseFloat(detalleCuota.capital),
        interes: parseFloat(detalleCuota.interes),
        fechaPagoEfectivo: fechaCobroEfectivo,
        comprobante: comprobanteSubido,
      },
    ]);
    setCreditos((prev) =>
      prev.map((c) =>
        c.id === credito.id ? { ...c, cuotasPagadas: mesACobrar } : c
      )
    );
    setComprobantesCobro((prev) => {
      const nuevo = { ...prev };
      delete nuevo[credito.id];
      return nuevo;
    });
    if (document.getElementById(`file-cobro-${credito.id}`))
      document.getElementById(`file-cobro-${credito.id}`).value = "";
    mostrarNotificacion(`Cuota recaudada exitosamente`);
  };

  const procesarTransferencia = (e) => {
    e.preventDefault();
    const monto = parseFloat(nuevaTransferencia.monto) || 0;
    if (
      monto <= 0 ||
      !nuevaTransferencia.paraSocioId ||
      !nuevaTransferencia.fecha
    )
      return mostrarNotificacion("Complete el formulario");
    if (monto > calcularAhorroNetoSocio(usuarioActual.id))
      return mostrarNotificacion("Saldo insuficiente");
    setTransferencias((prev) => [
      ...prev,
      {
        id: `trn-${Date.now()}`,
        deSocioId: usuarioActual.id,
        paraSocioId: nuevaTransferencia.paraSocioId,
        monto: monto,
        fecha: nuevaTransferencia.fecha,
      },
    ]);
    setNuevaTransferencia({ paraSocioId: "", monto: "", fecha: hoyString });
    mostrarNotificacion("Transferencia ejecutada");
  };

  const generarHistorialSocio = (idSocio) => {
    let transacciones = [];
    ahorros
      .filter((a) => a.socioId === idSocio)
      .forEach((a) => {
        transacciones.push({
          id: a.id,
          fecha: a.fecha,
          tipo: a.detalle || "Depósito de Ahorro",
          monto: parseFloat(a.monto),
          signo: "+",
        });
      });
    transferencias
      .filter((t) => t.deSocioId === idSocio)
      .forEach((t) => {
        const receptor =
          socios.find((s) => s.id === t.paraSocioId)?.nombre || "Socio";
        transacciones.push({
          id: t.id,
          fecha: t.fecha,
          tipo: `Transferencia enviada a ${receptor}`,
          monto: parseFloat(t.monto),
          signo: "-",
        });
      });
    transferencias
      .filter((t) => t.paraSocioId === idSocio)
      .forEach((t) => {
        const emisor =
          socios.find((s) => s.id === t.deSocioId)?.nombre || "Socio";
        transacciones.push({
          id: t.id,
          fecha: t.fecha,
          tipo: `Transferencia recibida de ${emisor}`,
          monto: parseFloat(t.monto),
          signo: "+",
        });
      });
    pagos
      .filter((p) => p.socioId === idSocio)
      .forEach((p) => {
        transacciones.push({
          id: p.id,
          fecha: p.fechaPagoEfectivo,
          tipo: `Pago de Cuota #${p.mes} (Préstamo)`,
          monto: parseFloat(p.montoTotal),
          signo: "-",
        });
      });
    transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const agrupado = {};
    transacciones.forEach((t) => {
      const mesKey = t.fecha.substring(0, 7);
      if (!agrupado[mesKey]) agrupado[mesKey] = [];
      agrupado[mesKey].push(t);
    });
    return agrupado;
  };

  // --- 1. PANTALLA DE ACCESO CON BIOMETRÍA ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center p-4">
        {/* Modal Simulación de Huella */}
        {escaneandoHuella && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-90 z-[200] flex flex-col items-center justify-center backdrop-blur-md">
            <Fingerprint
              size={100}
              className="text-teal-400 animate-pulse mb-6"
            />
            <h2 className="text-2xl font-black text-white tracking-widest uppercase">
              Verificando Identidad
            </h2>
            <p className="text-teal-200 mt-2 font-mono">
              Por favor, mantenga su dedo en el sensor...
            </p>
          </div>
        )}

        <div className="bg-white p-10 rounded-[2rem] shadow-2xl w-full max-w-md text-center border-t-8 border-teal-600 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 text-teal-50 opacity-50">
            <HeartHandshake size={150} />
          </div>
          <div className="relative z-10">
            <h1 className="text-5xl font-black text-teal-800 mb-2 tracking-tighter">
              MOMiER
            </h1>
            <p className="text-teal-700 font-bold text-sm mb-2 uppercase tracking-widest bg-teal-50 inline-block px-4 py-1 rounded-full">
              Economía Solidaria
            </p>
            <p className="text-gray-500 text-sm mb-8 mt-4 font-medium">
              Inicie sesión para acceder a su caja.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-left">
                <label className="text-xs font-bold text-teal-800 uppercase ml-2">
                  Cédula o Contraseña
                </label>
                <input
                  type="password"
                  placeholder="Ej: 1712345678 o admin123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 border-2 border-teal-100 rounded-2xl text-center text-xl font-mono focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-50 transition-all mt-1 bg-slate-50"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-teal-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-teal-700 shadow-md transition-all"
              >
                Ingresar al Sistema
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Acceso Rápido Seguro
              </p>
              <button
                onClick={loginBiometrico}
                type="button"
                className="w-full bg-slate-50 border-2 border-teal-200 text-teal-800 p-4 rounded-2xl font-black text-md hover:bg-teal-50 transition-all flex items-center justify-center gap-3"
              >
                <Fingerprint size={24} className="text-teal-600" /> Ingresar con
                Huella Digital
              </button>
            </div>

            <p className="text-[10px] text-gray-400 mt-6">
              * El ingreso con huella requiere haber iniciado sesión al menos
              una vez en este dispositivo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. VISTA SOCIO (BILLETERA PERSONAL CON ESTADOS DE CUENTA) ---
  if (rol === "socio") {
    const miAhorro = calcularAhorroNetoSocio(usuarioActual.id);
    const misCreditos = creditos.filter((c) => c.socioId === usuarioActual.id);
    let miDeudaTotal = 0;
    misCreditos.forEach((cred) => {
      let capitalPagado = 0;
      pagos
        .filter((p) => p.creditoId === cred.id)
        .forEach((p) => (capitalPagado += parseFloat(p.capital) || 0));
      miDeudaTotal += (parseFloat(cred.monto) || 0) - capitalPagado;
    });
    const balanceNeto = miAhorro - miDeudaTotal;
    const fechaHoraActual = new Date().toLocaleString("es-EC", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const historialAgrupado = generarHistorialSocio(usuarioActual.id);
    const mesesDisponibles = Object.keys(historialAgrupado).sort((a, b) =>
      b.localeCompare(a)
    );

    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-20 relative">
        {modalEstadoCuenta && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2rem] p-6 max-w-lg w-full shadow-2xl border-t-8 border-[#556B2F] max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    <List size={24} className="text-[#556B2F]" /> Estado de
                    Cuenta
                  </h2>
                  <p className="text-[#556B2F] font-bold text-sm uppercase tracking-widest">
                    {nombreMes(modalEstadoCuenta + "-01")}
                  </p>
                </div>
                <button
                  onClick={() => setModalEstadoCuenta(null)}
                  className="bg-gray-100 text-gray-500 hover:bg-gray-200 p-2 rounded-full transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 pr-2">
                <div className="space-y-3 mb-6">
                  {historialAgrupado[modalEstadoCuenta].map((trx) => (
                    <div
                      key={trx.id}
                      className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100"
                    >
                      <div>
                        <p className="text-sm font-bold text-gray-700">
                          {trx.tipo}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={10} /> {formatearFecha(trx.fecha)}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-black ${
                          trx.signo === "+"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {trx.signo} ${trx.monto.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {historialAgrupado[modalEstadoCuenta].length === 0 && (
                    <p className="text-center text-sm text-gray-400 italic">
                      No hay movimientos en este mes.
                    </p>
                  )}
                </div>
                <div className="bg-[#556B2F] bg-opacity-10 p-4 rounded-2xl border border-[#556B2F] border-opacity-20 mt-4">
                  <h4 className="text-[#556B2F] font-black text-sm uppercase mb-3">
                    Resumen Consolidado Actual
                  </h4>
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Fondo de Ahorro:</span>{" "}
                      <span className="font-bold">
                        + ${miAhorro.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Deuda Vigente:</span>{" "}
                      <span className="font-bold text-rose-600">
                        - ${miDeudaTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-t border-[#556B2F] border-opacity-20 pt-2">
                    <span className="text-xs font-bold uppercase text-[#556B2F]">
                      Balance Neto:
                    </span>
                    <span className="text-lg font-black text-[#556B2F]">
                      ${balanceNeto.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    mostrarNotificacion(
                      "Copia del estado de cuenta reenviada a su correo."
                    );
                    setModalEstadoCuenta(null);
                  }}
                  className="w-full bg-[#556B2F] text-white p-3 rounded-xl font-bold hover:bg-[#3a4a20] flex justify-center items-center gap-2 shadow-md"
                >
                  <Send size={16} /> Enviar Copia a mi Correo
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-teal-800 text-white p-6 shadow-lg rounded-b-[2rem]">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-black tracking-widest">MOMiER</h1>
            <button
              onClick={cerrarSesion}
              className="bg-white bg-opacity-20 p-2 rounded-xl hover:bg-opacity-30"
            >
              <LogOut size={16} />
            </button>
          </div>
          <p className="text-sm text-teal-100 opacity-80">
            Socio/a Solidario/a
          </p>
          <h2 className="text-2xl font-bold">{usuarioActual.nombre}</h2>
        </div>

        <div className="p-4 space-y-6 max-w-md mx-auto mt-4">
          <div className="bg-gradient-to-br from-[#556B2F] to-[#3a4a20] p-6 rounded-3xl text-white shadow-xl relative">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <PiggyBank size={80} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1">
              Fondo de Ahorros
            </p>
            <p className="text-5xl font-black">${miAhorro.toFixed(2)}</p>
          </div>
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm relative">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-gray-800 font-black text-lg flex items-center gap-2">
                <FileText size={18} className="text-[#556B2F]" /> Estado Actual
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full flex items-center gap-1">
                <Clock size={10} /> {fechaHoraActual}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Ahorrado:</span>{" "}
                <span className="font-bold text-[#556B2F]">
                  + ${miAhorro.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Deuda de Capital:</span>{" "}
                <span className="font-bold text-[#CC7722]">
                  - ${miDeudaTotal.toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">
                  Balance Neto Total:
                </span>{" "}
                <span
                  className={`text-xl font-black ${
                    balanceNeto >= 0 ? "text-[#556B2F]" : "text-rose-600"
                  }`}
                >
                  ${balanceNeto.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-[#8E44AD] border-opacity-30 rounded-3xl p-5 shadow-inner">
            <h3 className="text-[#8E44AD] font-black text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
              <List size={16} /> Historial Mensual
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Revisa todos tus movimientos y estados de cuenta anteriores.
            </p>
            {mesesDisponibles.length === 0 ? (
              <p className="text-sm text-gray-400 italic bg-white p-3 rounded-xl border text-center">
                Aún no registras historial.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {mesesDisponibles.map((mes) => (
                  <button
                    key={mes}
                    onClick={() => setModalEstadoCuenta(mes)}
                    className="bg-white border border-[#8E44AD] border-opacity-20 text-[#8E44AD] p-3 rounded-xl text-xs font-bold hover:bg-[#8E44AD] hover:text-white transition-colors flex flex-col items-center justify-center gap-1 shadow-sm"
                  >
                    <FileText size={16} />
                    {nombreMes(mes + "-01")}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white border-2 border-[#8E44AD] rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <h3 className="text-[#8E44AD] font-black text-lg mb-4 flex gap-2">
              <ArrowRightLeft size={18} /> Billetera Transaccional
            </h3>
            <form
              onSubmit={procesarTransferencia}
              className="space-y-4 relative z-10"
            >
              <select
                required
                value={nuevaTransferencia.paraSocioId}
                onChange={(e) =>
                  setNuevaTransferencia({
                    ...nuevaTransferencia,
                    paraSocioId: e.target.value,
                  })
                }
                className="w-full p-3 border-2 border-purple-100 rounded-xl bg-white focus:border-[#8E44AD] outline-none"
              >
                <option value="">Compañero/a Destino...</option>
                {socios
                  .filter((s) => s.id !== usuarioActual.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
              </select>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Monto a transferir ($)"
                value={nuevaTransferencia.monto}
                onChange={(e) =>
                  setNuevaTransferencia({
                    ...nuevaTransferencia,
                    monto: e.target.value,
                  })
                }
                className="w-full p-3 border-2 border-purple-100 rounded-xl font-bold focus:border-[#8E44AD] outline-none"
              />
              <div>
                <label className="block text-xs font-bold text-[#8E44AD] mb-1 uppercase flex items-center gap-1 cursor-pointer">
                  <Calendar size={14} /> Fecha de Envío
                </label>
                <input
                  type="date"
                  required
                  value={nuevaTransferencia.fecha}
                  onChange={(e) =>
                    setNuevaTransferencia({
                      ...nuevaTransferencia,
                      fecha: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-purple-100 rounded-xl bg-white text-sm focus:border-[#8E44AD] outline-none cursor-pointer"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#8E44AD] text-white p-4 rounded-xl font-bold hover:bg-[#732d91] transition-colors"
              >
                Enviar Fondos
              </button>
            </form>
          </div>
          <div className="space-y-4">
            <h3 className="text-[#CC7722] font-black text-lg">
              Préstamos Activos
            </h3>
            {misCreditos.map((cred) => {
              const liquidado = cred.cuotasPagadas >= parseInt(cred.meses);
              return (
                <div
                  key={cred.id}
                  className="bg-white border border-[#CC7722] rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold">Crédito ${cred.monto}</p>
                    <span className="text-xs font-bold px-2 py-1 bg-[#CC7722] bg-opacity-10 text-[#CC7722] rounded-full">
                      {cred.cuotasPagadas}/{cred.meses} Pagos
                    </span>
                  </div>
                  {!liquidado ? (
                    <p className="text-sm">
                      Siguiente cuota:{" "}
                      <strong>${cred.tabla[cred.cuotasPagadas]?.cuota}</strong>{" "}
                      <br />
                      <span className="text-xs text-gray-500">
                        Vence:{" "}
                        {formatearFecha(
                          cred.tabla[cred.cuotasPagadas]?.fechaVencimiento
                        )}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-emerald-600 font-bold">
                      Liquidado
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- 3. VISTA ADMINISTRADOR ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {socioEdicion && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border-t-8 border-[#8E44AD]">
            <h2 className="text-2xl font-black mb-4 text-[#8E44AD] flex items-center gap-2">
              <Edit size={24} /> Editar Datos del Socio
            </h2>
            <form onSubmit={guardarEdicionSocio} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={socioEdicion.nombre}
                  onChange={(e) =>
                    setSocioEdicion({ ...socioEdicion, nombre: e.target.value })
                  }
                  className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-[#8E44AD] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                  Número de Cédula
                </label>
                <input
                  type="text"
                  required
                  value={socioEdicion.cedula}
                  onChange={(e) =>
                    setSocioEdicion({ ...socioEdicion, cedula: e.target.value })
                  }
                  className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-[#8E44AD] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={socioEdicion.correo}
                  onChange={(e) =>
                    setSocioEdicion({ ...socioEdicion, correo: e.target.value })
                  }
                  className="w-full p-3 border-2 border-slate-100 rounded-xl focus:border-[#8E44AD] outline-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setSocioEdicion(null)}
                  className="flex-1 bg-gray-100 text-gray-600 hover:bg-gray-200 p-3 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#8E44AD] text-white p-3 rounded-xl font-bold shadow-md hover:bg-[#732d91] transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalBienvenida && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full text-center shadow-2xl border-t-8 border-teal-600 relative overflow-hidden">
            <div className="absolute -top-10 -left-10 text-teal-50 opacity-50">
              <BookOpen size={150} />
            </div>
            <div className="relative z-10">
              <HeartHandshake
                size={60}
                className="mx-auto text-teal-600 mb-4"
              />
              <h2 className="text-3xl font-black mb-2 text-gray-800">
                ¡Socio Dado de Alta!
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Se ha habilitado la billetera para{" "}
                <strong>{modalBienvenida.nombre}</strong> y se ha enviado la
                carta a <em>{modalBienvenida.correo}</em>:
              </p>
              <div className="bg-teal-50 p-5 rounded-2xl border border-teal-100 text-left mb-6 shadow-inner">
                <p className="text-xs font-bold text-teal-800 uppercase tracking-widest mb-2 border-b border-teal-200 pb-2">
                  Valores MOMiER
                </p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4 font-medium">
                  <li>Solidaridad y Compañerismo</li>
                  <li>Confianza y Respeto Mutuo</li>
                  <li>Transparencia Financiera</li>
                </ul>
              </div>
              <button
                onClick={() => setModalBienvenida(null)}
                className="w-full bg-teal-600 text-white p-4 rounded-xl font-bold shadow-md hover:bg-teal-700 text-lg transition-all"
              >
                Aceptar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCorreoCredito && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full text-center shadow-2xl border-t-8 border-[#CC7722] relative overflow-hidden">
            <div className="absolute -top-10 -left-10 text-amber-50 opacity-50">
              <Mail size={150} />
            </div>
            <div className="relative z-10">
              <div className="bg-amber-100 p-4 rounded-full inline-block mb-4 shadow-sm">
                <Mail size={40} className="text-[#CC7722]" />
              </div>
              <h2 className="text-3xl font-black mb-2 text-gray-800">
                ¡Contrato Generado!
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                El crédito por <strong>${modalCorreoCredito.monto}</strong> fue
                aprobado con éxito.
              </p>
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-left mb-6 shadow-inner">
                <p className="text-xs font-bold text-[#CC7722] uppercase tracking-widest mb-2 border-b border-amber-200 pb-2 flex items-center gap-2">
                  <CheckCircle size={14} /> Notificación
                </p>
                <p className="text-sm text-gray-700">
                  Se ha enviado la tabla de amortización a:
                </p>
                <p className="font-mono text-blue-800 mt-3 font-bold text-center bg-white p-2 rounded-lg border border-amber-100">
                  {modalCorreoCredito.correo}
                </p>
              </div>
              <button
                onClick={() => setModalCorreoCredito(null)}
                className="w-full bg-[#CC7722] text-white p-4 rounded-xl font-bold shadow-md hover:bg-[#b0661c] text-lg transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full md:w-64 bg-teal-800 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-white border-opacity-10 flex justify-between items-center">
          <h1 className="text-2xl font-black">MOMiER Admin</h1>
          <button onClick={cerrarSesion} className="md:hidden">
            <LogOut size={20} />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { id: "resumen", icon: DollarSign, label: "Resumen Global" },
            { id: "socios", icon: Users, label: "Gestión Socios" },
            { id: "ahorros", icon: PiggyBank, label: "Libro de Ahorros" },
            { id: "creditos", icon: CreditCard, label: "Otorgar Créditos" },
            { id: "cobros", icon: CheckSquare, label: "Cobrar Cuotas" },
            {
              id: "transferencias",
              icon: ArrowRightLeft,
              label: "Movimientos P2P",
            },
            { id: "estados", icon: FileText, label: "Estados de Cuenta" },
            { id: "ajustes", icon: Settings, label: "Configuración" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.id
                  ? "bg-white text-gray-900 shadow-md"
                  : "text-teal-100 hover:bg-teal-700"
              }`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 hidden md:block">
          <button
            onClick={cerrarSesion}
            className="w-full bg-black bg-opacity-20 p-3 rounded-xl text-sm font-bold text-teal-100 hover:bg-opacity-30"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        {activeTab === "resumen" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-[#556B2F]">
              Balance Financiero
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-3xl border-t-8 border-[#556B2F]">
                <p className="text-xs text-gray-400 font-bold uppercase">
                  Fondo Total
                </p>
                <p className="text-4xl font-black text-gray-800 mt-1">
                  ${balancesGlobales.fondoTotal.toFixed(2)}
                </p>
              </div>
              <div className="bg-[#556B2F] p-6 rounded-3xl text-white shadow-lg">
                <p className="text-xs font-bold uppercase text-lime-200">
                  Dinero Disponible
                </p>
                <p className="text-4xl font-black mt-1">
                  ${balancesGlobales.disponibleParaPrestar.toFixed(2)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-3xl border-t-8 border-[#CC7722]">
                <p className="text-xs text-gray-400 font-bold uppercase">
                  Capital en Créditos
                </p>
                <p className="text-4xl font-black text-gray-800 mt-1">
                  ${balancesGlobales.capitalPrestado.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "socios" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm">
              <h3 className="font-bold text-[#8E44AD] mb-4 text-lg">
                Inscribir Nuevo Socio
              </h3>
              <form
                onSubmit={guardarSocio}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
              >
                <div>
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoSocio.nombre}
                    onChange={(e) =>
                      setNuevoSocio({ ...nuevoSocio, nombre: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase">
                    Cédula
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoSocio.cedula}
                    onChange={(e) =>
                      setNuevoSocio({ ...nuevoSocio, cedula: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase">
                    Correo
                  </label>
                  <input
                    type="email"
                    required
                    value={nuevoSocio.correo}
                    onChange={(e) =>
                      setNuevoSocio({ ...nuevoSocio, correo: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase flex items-center gap-1 cursor-pointer">
                    <Calendar size={14} /> Calendario de Ingreso
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevoSocio.fechaIngreso}
                    onChange={(e) =>
                      setNuevoSocio({
                        ...nuevoSocio,
                        fechaIngreso: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none cursor-pointer focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase">
                    Aporte Inicial ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={nuevoSocio.aporteInicial}
                    onChange={(e) =>
                      setNuevoSocio({
                        ...nuevoSocio,
                        aporteInicial: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase flex items-center gap-1">
                    <Paperclip size={14} /> Comprobante Inicial
                  </label>
                  <input
                    type="file"
                    id="fileUploadSocio"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      setNuevoSocio({
                        ...nuevoSocio,
                        comprobante: e.target.files[0]?.name,
                      })
                    }
                    className="w-full p-2 border-2 border-dashed border-purple-200 rounded-xl text-sm file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  className="md:col-span-3 bg-[#8E44AD] text-white p-3 rounded-xl font-bold shadow-md hover:bg-[#732d91] h-[50px] transition-all"
                >
                  Registrar Socio y Emitir Decálogo
                </button>
              </form>
            </div>
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50 text-[#8E44AD] font-bold">
                  <tr>
                    <th className="p-4">Socio</th>
                    <th className="p-4">Cédula</th>
                    <th className="p-4">Fecha Alta</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {socios.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-gray-700">
                        {s.nombre}
                      </td>
                      <td className="p-4 font-mono text-gray-500">
                        {s.cedula}
                      </td>
                      <td className="p-4 text-gray-500">
                        {formatearFecha(s.fechaIngreso)}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSocioEdicion(s)}
                          className="text-[#8E44AD] hover:bg-purple-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 mx-auto transition-colors"
                        >
                          <Edit size={12} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "ahorros" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm">
              <h3 className="font-bold text-[#8E44AD] mb-4 text-lg">
                Asentar Ahorro Ordinario
              </h3>
              <form
                onSubmit={registrarAhorro}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
              >
                <div>
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase">
                    Socio Depositante
                  </label>
                  <select
                    required
                    value={nuevoAhorro.socioId}
                    onChange={(e) =>
                      setNuevoAhorro({
                        ...nuevoAhorro,
                        socioId: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-[#8E44AD]"
                  >
                    <option value="">Seleccione...</option>
                    {socios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase">
                    Monto ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={nuevoAhorro.monto}
                    onChange={(e) =>
                      setNuevoAhorro({ ...nuevoAhorro, monto: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase flex items-center gap-1 cursor-pointer">
                    <Calendar size={14} /> Calendario
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevoAhorro.fecha}
                    onChange={(e) =>
                      setNuevoAhorro({ ...nuevoAhorro, fecha: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none cursor-pointer focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-purple-400 mb-1 uppercase flex items-center gap-1">
                    <Paperclip size={14} /> Adjuntar Comprobante
                  </label>
                  <input
                    type="file"
                    id="fileUploadAhorro"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      setNuevoAhorro({
                        ...nuevoAhorro,
                        comprobante: e.target.files[0]?.name,
                      })
                    }
                    className="w-full p-2 border-2 border-dashed border-purple-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  className="md:col-span-2 bg-[#8E44AD] text-white p-3 rounded-xl font-bold shadow-md hover:bg-[#732d91] h-[45px]"
                >
                  Registrar Depósito
                </button>
              </form>
            </div>
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold">
                  <tr>
                    <th className="p-4">Socio</th>
                    <th className="p-4 flex items-center gap-1">
                      <Calendar size={14} /> Fecha
                    </th>
                    <th className="p-4">Respaldo</th>
                    <th className="p-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ahorros
                    .slice()
                    .reverse()
                    .map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold text-gray-700">
                          {socios.find((s) => s.id === a.socioId)?.nombre ||
                            "Socio"}
                        </td>
                        <td className="p-4 text-gray-500">
                          {formatearFecha(a.fecha)}
                        </td>
                        <td className="p-4">
                          {a.comprobante ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              <Paperclip size={12} /> Adjunto
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Sin adjunto
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right text-emerald-600 font-bold font-mono">
                          + ${Number(a.monto).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "creditos" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-[#CC7722]">
              Apertura de Créditos
            </h2>
            <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5 items-end">
                <div>
                  <label className="block text-xs font-bold text-[#CC7722] mb-1 uppercase">
                    Socio
                  </label>
                  <select
                    value={simulador.socioId}
                    onChange={(e) =>
                      setSimulador({ ...simulador, socioId: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                  >
                    <option value="">Seleccione...</option>
                    {socios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#CC7722] mb-1 uppercase">
                    Monto ($)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={simulador.monto}
                    onChange={(e) =>
                      setSimulador({ ...simulador, monto: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#CC7722] mb-1 uppercase">
                    Tasa (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 12.5"
                    value={simulador.tasa}
                    onChange={(e) =>
                      setSimulador({ ...simulador, tasa: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#CC7722] mb-1 uppercase">
                    Plazo (Meses)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 12"
                    value={simulador.meses}
                    onChange={(e) =>
                      setSimulador({ ...simulador, meses: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#CC7722] mb-1 uppercase flex items-center gap-1 cursor-pointer">
                    <Calendar size={14} /> Calendario
                  </label>
                  <input
                    type="date"
                    value={simulador.fechaOtorgamiento}
                    onChange={(e) =>
                      setSimulador({
                        ...simulador,
                        fechaOtorgamiento: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl bg-slate-50 outline-none cursor-pointer focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={calcularAmortizacion}
                  className="flex-1 bg-gray-800 text-white p-3 rounded-xl font-bold"
                >
                  1. Simular Tabla
                </button>
                <button
                  onClick={aprobarCredito}
                  className="flex-1 bg-[#CC7722] text-white p-3 rounded-xl font-bold hover:bg-[#b0661c]"
                >
                  2. Aprobar Crédito
                </button>
              </div>
            </div>
            {tablaAmortizacion.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#CC7722] bg-opacity-10 text-[#CC7722] font-bold">
                    <tr>
                      <th className="p-3">Mes</th>
                      <th className="p-3 flex items-center gap-1">
                        <Calendar size={14} /> Fecha Prevista (Vencimiento)
                      </th>
                      <th className="p-3">Valor Cuota</th>
                      <th className="p-3">Saldo Deuda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tablaAmortizacion.map((fila) => (
                      <tr key={fila.mes}>
                        <td className="p-3 font-bold">{fila.mes}</td>
                        <td className="p-3">
                          {formatearFecha(fila.fechaVencimiento)}
                        </td>
                        <td className="p-3 font-bold text-blue-900">
                          ${fila.cuota}
                        </td>
                        <td className="p-3 font-mono text-gray-500">
                          ${fila.saldo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "cobros" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-[#CC7722]">
              Recaudar Cuotas
            </h2>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 max-w-md shadow-sm transition-all hover:border-amber-400">
              <label className="flex items-center gap-2 text-sm font-black text-[#CC7722] uppercase tracking-wider mb-3 cursor-pointer">
                <Calendar size={20} /> Fecha de Cobro
              </label>
              <input
                type="date"
                value={fechaCobroEfectivo}
                onChange={(e) => setFechaCobroEfectivo(e.target.value)}
                className="w-full p-4 border rounded-xl bg-white text-lg font-bold outline-none cursor-pointer shadow-inner focus:ring-4 focus:ring-amber-200 text-gray-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {creditos.length === 0 && (
                <p className="text-gray-400 text-sm italic col-span-2">
                  No se registran créditos activos.
                </p>
              )}
              {creditos.map((cred) => {
                const socio = socios.find((s) => s.id === cred.socioId);
                const liquidado = cred.cuotasPagadas >= parseInt(cred.meses);
                return (
                  <div
                    key={cred.id}
                    className="p-5 rounded-2xl bg-white border border-amber-100 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800">
                            {socio?.nombre || "Socio"}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar size={12} /> Apertura:{" "}
                            {formatearFecha(cred.fechaAprobacion)}
                          </p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-[#CC7722] rounded-full">
                          {cred.cuotasPagadas}/{cred.meses} Pagos
                        </span>
                      </div>
                    </div>
                    {!liquidado ? (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                            <Paperclip size={12} /> Adjuntar Recibo
                          </label>
                          <input
                            type="file"
                            id={`file-cobro-${cred.id}`}
                            accept="image/*,.pdf"
                            onChange={(e) =>
                              setComprobantesCobro({
                                ...comprobantesCobro,
                                [cred.id]: e.target.files[0]?.name,
                              })
                            }
                            className="w-full text-xs file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-[#CC7722] hover:file:bg-amber-100 cursor-pointer"
                          />
                        </div>
                        <button
                          onClick={() => registrarCobroCuota(cred)}
                          className="w-full bg-[#CC7722] text-white py-3 rounded-xl font-bold shadow-sm hover:bg-[#a6601b] transition-colors"
                        >
                          Cobrar Cuota de $
                          {cred.tabla[cred.cuotasPagadas]?.cuota}
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-emerald-700 font-bold text-sm uppercase pt-4 border-t border-gray-100 mt-4">
                        Contrato Cancelado
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "transferencias" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-teal-600">
              Auditoría Billetera P2P
            </h2>
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-teal-600 text-white font-bold">
                  <tr>
                    <th className="p-4 flex items-center gap-1">
                      <Calendar size={14} /> Fecha Transacción
                    </th>
                    <th className="p-4">Origen</th>
                    <th className="p-4">Destino</th>
                    <th className="p-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transferencias.map((t) => (
                    <tr key={t.id} className="hover:bg-teal-50">
                      <td className="p-4">{formatearFecha(t.fecha)}</td>
                      <td className="p-4 font-bold">
                        {socios.find((s) => s.id === t.deSocioId)?.nombre}
                      </td>
                      <td className="p-4 font-bold">
                        {socios.find((s) => s.id === t.paraSocioId)?.nombre}
                      </td>
                      <td className="p-4 text-right font-bold text-teal-600">
                        ${t.monto.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "estados" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-[#556B2F]">
              Estados Consolidados
            </h2>
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 text-white border-b">
                  <tr>
                    <th className="p-4">Socio Participante</th>
                    <th className="p-4">Ahorro Neto</th>
                    <th className="p-4">Deuda Capital</th>
                    <th className="p-4">Balance General</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {socios.map((s) => {
                    const ahorrado = calcularAhorroNetoSocio(s.id);
                    let deuda = 0;
                    const misCreditos = creditos.filter(
                      (c) => c.socioId === s.id
                    );
                    for (let i = 0; i < misCreditos.length; i++) {
                      let cp = 0;
                      pagos
                        .filter((p) => p.creditoId === misCreditos[i].id)
                        .forEach((p) => (cp += parseFloat(p.capital) || 0));
                      deuda += (parseFloat(misCreditos[i].monto) || 0) - cp;
                    }
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold">{s.nombre}</td>
                        <td className="p-4 text-[#556B2F] font-bold">
                          + ${ahorrado.toFixed(2)}
                        </td>
                        <td className="p-4 text-[#CC7722] font-bold">
                          - ${deuda.toFixed(2)}
                        </td>
                        <td
                          className={`p-4 font-black ${
                            ahorrado - deuda >= 0
                              ? "text-[#556B2F]"
                              : "text-rose-600"
                          }`}
                        >
                          ${(ahorrado - deuda).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "ajustes" && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-teal-800">Configuración</h2>
            <div className="bg-white p-6 rounded-3xl border border-teal-100 shadow-sm max-w-2xl">
              <h3 className="font-bold text-teal-800 mb-4 text-lg">
                Parámetros Operativos
              </h3>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-bold text-teal-600 uppercase mb-2">
                    Tolerancia Ahorros (Días)
                  </label>
                  <input
                    type="number"
                    value={config.diasAhorro}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        diasAhorro: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-3 border-2 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-teal-600 uppercase mb-2">
                    Tolerancia Cuotas (Días)
                  </label>
                  <input
                    type="number"
                    value={config.diasCuota}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        diasCuota: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full p-3 border-2 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-teal-700 to-teal-900 p-8 rounded-3xl text-white shadow-xl max-w-2xl">
              <ShieldCheck size={48} className="mb-4 text-teal-200" />
              <h3 className="text-xl font-bold mb-2">Respaldo</h3>
              <button
                onClick={descargarRespaldo}
                className="px-6 bg-white text-teal-900 p-3 rounded-xl font-black flex items-center gap-2"
              >
                <Download size={20} /> Descargar Archivo Seguro
              </button>
            </div>
          </div>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="font-semibold text-sm">{toast}</span>
        </div>
      )}
    </div>
  );
}
