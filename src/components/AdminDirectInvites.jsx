import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import { 
  Send, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink, 
  Plus, 
  Search, 
  ArrowLeft, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Building2, 
  User, 
  X,
  FileSpreadsheet,
  FileUp,
  Download,
  AlertCircle,
  Users,
  Edit2,
  Image as ImageIcon,
  Palette,
  Eye,
  Layers,
  Sparkles,
  Phone,
  Tag,
  CheckSquare,
  LayoutGrid,
  ListFilter,
  ChevronRight,
  SendHorizontal,
  MailCheck,
  RefreshCw,
  AlertTriangle,
  StopCircle,
  Zap,
  ShieldAlert,
  Timer,
  Bell,
  MessageSquare,
  QrCode,
  Loader2
} from 'lucide-react';
import AdminQRViewModal from './AdminQRViewModal';
import { 
  checkTemplateStatus, 
  sendDirectInviteViaWati, 
  cleanPhoneNumber, 
  DEFAULT_WATI_CONFIG 
} from '../services/watiService';

export default function AdminDirectInvites({ onBack, adminUser }) {
  const [invites, setInvites] = useState([]);
  const [standsData, setStandsData] = useState([]);
  const [sponsorsMap, setSponsorsMap] = useState({});
  const [sponsorSettings, setSponsorSettings] = useState({});
  const [loading, setLoading] = useState(true);

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedPersonForQR, setSelectedPersonForQR] = useState(null);
  
  // Modo de Vista: 'sponsors' (Directorio de Patrocinadores) | 'invites' (Detalle de Invitados)
  const [viewMode, setViewMode] = useState('sponsors');
  
  // Filtros
  const [sponsorSearchTerm, setSponsorSearchTerm] = useState('');
  const [sponsorFilterStatus, setSponsorFilterStatus] = useState('all'); // 'all' | 'has_registered' | 'has_pending' | 'has_unsent_emails' | 'has_invites'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'used'
  const [selectedSponsorFilter, setSelectedSponsorFilter] = useState('all'); // 'all' | 'general' | sponsorName

  // Modal para Crear Nueva Invitación Individual
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestCompany, setGuestCompany] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestSponsor, setGuestSponsor] = useState('general');
  const [isCreating, setIsCreating] = useState(false);

  // Modal para Editar Invitado
  const [editModal, setEditModal] = useState({ open: false, invite: null });
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSponsor, setEditSponsor] = useState('general');
  const [isUpdatingGuest, setIsUpdatingGuest] = useState(false);

  // Modal para Configurar Artes y Speech de Patrocinador
  const [artModal, setArtModal] = useState({ open: false, sponsorKey: '', sponsorName: '', stands: '' });
  const [artHeaderUrl, setArtHeaderUrl] = useState('');
  const [artFooterUrl, setArtFooterUrl] = useState('');
  const [artWhatsappBannerUrl, setArtWhatsappBannerUrl] = useState('');
  const [artWhatsappReminderBannerUrl, setArtWhatsappReminderBannerUrl] = useState('');
  const [artStands, setArtStands] = useState('');
  const [artCustomSpeech, setArtCustomSpeech] = useState('');
  const [artCustomSubject, setArtCustomSubject] = useState('');
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const [isUploadingFooter, setIsUploadingFooter] = useState(false);
  const [isUploadingWhatsapp, setIsUploadingWhatsapp] = useState(false);
  const [isUploadingWhatsappReminder, setIsUploadingWhatsappReminder] = useState(false);
  const [isSavingArt, setIsSavingArt] = useState(false);
  const [artTab, setArtTab] = useState('banners'); // 'banners' | 'whatsapp' | 'speech' | 'preview'
  const [artPreviewChannel, setArtPreviewChannel] = useState('email'); // 'email' | 'whatsapp_invite' | 'whatsapp_reminder'

  // Modal para Envío y Recordatorio por WhatsApp con Arte de Patrocinador
  const [whatsAppModal, setWhatsAppModal] = useState({ open: false, invite: null, isReminder: false });

  // Modal para Carga Masiva (Excel)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkTargetSponsor, setBulkTargetSponsor] = useState('auto');
  const [skipBulkDuplicates, setSkipBulkDuplicates] = useState(true);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);
  const singleSponsorFileInputRef = useRef(null);
  const [targetedUploadSponsor, setTargetedUploadSponsor] = useState(null);

  // Modal para Enviar Correo Directo Individual
  const [emailModal, setEmailModal] = useState({ open: false, invite: null });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

  // Modal para Envío Masivo de Correos por Patrocinador / General
  const [bulkEmailModal, setBulkEmailModal] = useState({
    open: false,
    sponsorName: 'general',
    sponsorDisplayName: 'Invitación General',
    filterType: 'never_sent', // 'never_sent' | 'all_pending'
    batchLimit: 'all', // 'all' | '25' | '50' | '100'
    paceSpeed: 'safe' // 'safe' (250ms) | 'normal' (120ms) | 'fast' (40ms)
  });
  const [isBulkSendingEmail, setIsBulkSendingEmail] = useState(false);
  const [bulkEmailProgress, setBulkEmailProgress] = useState({ current: 0, total: 0, failed: 0 });
  const cancelBulkEmailRef = useRef(false);

  // Estados para WATI WhatsApp API (Individual y Masivo por Patrocinador)
  const [isSendingWatiId, setIsSendingWatiId] = useState(null);
  const [watiNotification, setWatiNotification] = useState(null);
  const [watiTemplateInfo, setWatiTemplateInfo] = useState(null);

  // Modal para Envío Masivo de WhatsApp por WATI (por Patrocinador)
  const [bulkWatiModal, setBulkWatiModal] = useState({
    open: false,
    sponsorName: 'general',
    sponsorDisplayName: 'Invitación General',
    filterType: 'never_sent', // 'never_sent' | 'all_pending'
    batchLimit: 'all', // 'all' | '10' | '25' | '50'
    paceSpeed: 'safe' // 'safe' (1000ms) | 'normal' (600ms)
  });
  const [isBulkSendingWati, setIsBulkSendingWati] = useState(false);
  const [bulkWatiProgress, setBulkWatiProgress] = useState({ current: 0, total: 0, failed: 0, stopped: false });
  const [bulkWatiResult, setBulkWatiResult] = useState(null);
  const cancelBulkWatiRef = useRef(false);

  // Consultar estado de plantilla de Wati al montar
  useEffect(() => {
    checkTemplateStatus().then(info => {
      setWatiTemplateInfo(info);
    }).catch(err => {
      console.warn('No se pudo verificar plantilla Wati al inicio:', err);
    });
  }, []);

  // Helper para validación estricta de formato de correo
  const isValidEmailAddress = (email) => {
    if (!email || typeof email !== 'string') return false;
    const cleaned = email.trim();
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return re.test(cleaned);
  };

  // Helper para pausas de ritmo controlado (Throttling / Antispam Pacing)
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Copiado feedback
  const [copiedToken, setCopiedToken] = useState(null);

  // 1. Escuchar invitaciones directas
  useEffect(() => {
    const q = query(collection(db, `${getEventBasePath()}/directInvites`));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          usedAt: doc.data().usedAt?.toDate() || null
        });
      });
      results.sort((a, b) => b.createdAt - a.createdAt);
      setInvites(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching direct invites:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Escuchar stands para extraer patrocinadores oficiales
  useEffect(() => {
    const unsubStands = onSnapshot(collection(db, `${getEventBasePath()}/stands`), (snapshot) => {
      const stands = [];
      const sMap = {};

      snapshot.forEach((d) => {
        const s = d.data();
        stands.push({ id: d.id, ...s });
        
        let comp = (s.company || s.reservationDetails?.empresa || '').trim();
        if (comp.toLowerCase().includes('monolit') || comp.toLowerCase().includes('precom')) {
          comp = 'Monolit';
        }
        const isReserved = s.status !== 'available' && s.status !== 'free' && s.status !== 'libre' && (s.status === 'reserved' || s.status === 'reserved_official' || s.status === 'sold' || s.status === 'occupied' || s.reservationDetails || s.sponsorId || s.sponsorEmail || s.reservedBy);
        if (comp && isReserved) {
          if (!sMap[comp]) {
            sMap[comp] = {
              name: comp,
              stands: [],
              contactName: s.reservationDetails ? `${s.reservationDetails.nombre || ''} ${s.reservationDetails.apellido || ''}`.trim() : s.reservedBy || '',
              email: s.reservationDetails?.correo || s.sponsorEmail || '',
              phone: s.reservationDetails?.telefono || s.phone || ''
            };
          }
          sMap[comp].stands.push(s.name || s.id);
        }
      });

      setStandsData(stands);
      setSponsorsMap(sMap);
    });

    return () => unsubStands();
  }, []);

  // 3. Escuchar configuraciones de artes de patrocinadores (sponsorSettings)
  useEffect(() => {
    const unsubSettings = onSnapshot(collection(db, `${getEventBasePath()}/sponsorSettings`), (snapshot) => {
      const settings = {};
      snapshot.forEach((d) => {
        settings[d.id] = { id: d.id, ...d.data() };
      });
      setSponsorSettings(settings);
    });

    return () => unsubSettings();
  }, []);

  const getSponsorKey = (name) => {
    if (!name || name === 'general' || name.toLowerCase().includes('general') || name.toLowerCase().includes('expoferre')) {
      return 'general';
    }
    const clean = name.toLowerCase().trim();
    if (clean.includes('sur')) return 'grupo_sur';
    if (clean.includes('fernandez') || clean.includes('fernández') || clean.includes('sera')) return 'fernandez_sera';
    if (clean.includes('balladares')) return 'importaciones_balladares';
    if (clean.includes('sicsa') || clean.includes('siccsa')) return 'sicsa';
    if (clean.includes('sinsa')) return 'sinsa';
    if (clean.includes('cemex')) return 'cemex';
    if (clean.includes('lafise')) return 'lafise';
    if (clean.includes('bac')) return 'bac';
    if (clean.includes('indenicsa')) return 'indenicsa';
    if (clean.includes('plycem')) return 'plycem';
    if (clean.includes('casco')) return 'casco';
    if (clean.includes('midesa')) return 'midesa';
    if (clean.includes('noelito')) return 'noelito';
    if (clean.includes('sherwin')) return 'sherwin_williams';
    if (clean.includes('armoconsa')) return 'armoconsa';
    if (clean.includes('extel')) return 'extel';
    if (clean.includes('megalina') || clean.includes('megalinea')) return 'megalineas';
    if (clean.includes('amanco') || clean.includes('wavin')) return 'amanco_wavin';
    if (clean.includes('holcim') || clean.includes('disensa')) return 'holcim_disensa';
    if (clean.includes('monolit') || clean.includes('precom')) return 'monolit';
    if (clean.includes('futec')) return 'futec';
    if (clean.includes('madinisa') || clean.includes('sonax')) return 'madinisa';
    if (clean.includes('incasa') || clean.includes('ipsm')) return 'incasa';
    if (clean.includes('eaton')) return 'eaton';
    if (clean.includes('tigo')) return 'tigo';
    if (clean.includes('parque') || clean.includes('zaratoga') || clean.includes('baratogo') || clean.includes('tucasa')) return 'parques_industriales';
    if (clean.includes('romax') || clean.includes('maximiza')) return 'romax';
    if (clean.includes('jp') || clean.includes('studio') || clean.includes('technology')) return 'jp_technology_studio';
    return clean.replace(/[^a-z0-9]/g, '_');
  };

  const isMatchingSponsor = (sp1, sp2) => {
    if (!sp1 || !sp2) return false;
    const clean1 = (sp1 || '').trim().toLowerCase();
    const clean2 = (sp2 || '').trim().toLowerCase();
    if (clean1 === clean2) return true;
    const k1 = getSponsorKey(sp1);
    const k2 = getSponsorKey(sp2);
    if (k1 && k2 && k1 !== 'general' && k1 === k2) return true;
    return clean1.includes(clean2) || clean2.includes(clean1);
  };

  const cleanPhoneDigits = (str) => String(str || '').replace(/\D/g, '');

  const isExistingInvite = (candidate, existingInvites) => {
    if (!existingInvites || existingInvites.length === 0 || !candidate) return null;
    const candEmail = candidate.email ? candidate.email.trim().toLowerCase() : '';
    const candPhoneDigits = candidate.telefono ? cleanPhoneDigits(candidate.telefono) : '';
    const candName = candidate.nombre ? candidate.nombre.trim().toLowerCase() : '';
    const candCompany = candidate.empresa ? candidate.empresa.trim().toLowerCase() : '';

    return existingInvites.find(inv => {
      // 1. Coincidencia por correo válido
      if (candEmail && inv.email && inv.email.trim().toLowerCase() === candEmail) {
        return true;
      }
      // 2. Coincidencia por teléfono (si tiene al menos 7 dígitos)
      if (candPhoneDigits.length >= 7 && inv.telefono) {
        const invPhoneDigits = cleanPhoneDigits(inv.telefono);
        if (invPhoneDigits.length >= 7 && (invPhoneDigits === candPhoneDigits || invPhoneDigits.endsWith(candPhoneDigits) || candPhoneDigits.endsWith(invPhoneDigits))) {
          return true;
        }
      }
      // 3. Coincidencia por Nombre + Empresa exactos
      if (candName && candCompany && inv.nombre && inv.empresa) {
        if (inv.nombre.trim().toLowerCase() === candName && inv.empresa.trim().toLowerCase() === candCompany) {
          return true;
        }
      }
      return false;
    }) || null;
  };

  const buildCorporateSpeech = (sponsorName, stands) => {
    return `Sé parte de EXPO FERRE Nicaragua 2026! 
Un espacio exclusivo creado para tí, donde podrás encontrar capacitaciones y novedades que te ayudarán afortalecer relaciones comerciales y generar nuevas oportunidades de negocio.

Hola [Nombre],

Nos complace invitarte a ser parte de la primera edición de EXPO FERRE Nicaragua 2026, un encuentro creado para impulsar, conectar y fortalecer la industria ferretera en Nicaragua.

Será una jornada para generar nuevas conexiones, compartir conocimientos, conocer soluciones innovadoras y descubrir oportunidades de negocio que contribuyan al crecimiento del sector.

Estamos muy felices de contar contigo en este primer capítulo de EXPO FERRE Nicaragua 2026 y esperamos compartir contigo una experiencia llena de oportunidades, novedades y grandes conexiones.

¡Será un verdadero gusto tenerte con nosotros!

📅 Fecha: 17 de Octubre
📍 Lugar: Centro de Convenciones Crowne Plaza Managua
⏰ Hora: 8:00 AM a 5:00 PM (Registro desde 7:00 AM)

Hemos reservado para ti un pase exclusivo. Para activar tu acceso y recibir tu Gafete Oficial con Código QR, por favor completa tu registro en el siguiente enlace único:

🔗 {enlace}

⚠️ Nota: Este enlace es personal, intransferible y de un solo uso. Una vez completado tu registro, el enlace se desactivará automáticamente.

¡Contamos con tu valiosa presencia!`;
  };

  const buildCorporateReminderSpeech = (sponsorName, stands) => {
    const standsClean = stands ? (stands.toLowerCase().startsWith('stand') ? stands : `Stand ${stands}`) : '';
    const sponsorHeader = sponsorName && sponsorName !== 'general' && sponsorName.toLowerCase() !== 'invitación general'
      ? `por cortesía de *${sponsorName}*${standsClean ? ` (${standsClean})` : ''}`
      : 'de la organización oficial';

    return `¡Recordatorio de Invitación a EXPO FERRE Nicaragua 2026! 🔔

Hola [Nombre],

Esperamos que te encuentres muy bien. Te escribimos para recordarte que tienes reservado tu pase exclusivo ${sponsorHeader} para la primera edición de *EXPO FERRE Nicaragua 2026*.

Aún estás a tiempo de confirmar tu asistencia y recibir tu *Gafete Oficial con Código QR* para ingresar de manera preferencial y sin filas.

📅 Fecha: 17 de Octubre
📍 Lugar: Centro de Convenciones Crowne Plaza Managua
⏰ Hora: 8:00 AM a 5:00 PM (Registro desde 7:00 AM)

👉 Por favor activa tu pase completando tu registro en este enlace único:
🔗 {enlace}

⚠️ Nota: Este enlace es personal, intransferible y de un solo uso. Una vez completado tu registro, el enlace se desactivará automáticamente.

¡Contamos con tu valiosa presencia! 🚀`;
  };

  // Configuraciones y speeches oficiales predeterminados por marca
  const OFFICIAL_SPONSOR_CONFIGS = {
    sinsa: {
      sponsorName: 'SINSA',
      stands: 'Stands 1, 2, 3, 4',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con SINSA!',
      customSpeech: buildCorporateSpeech('SINSA', 'Stands 1, 2, 3, 4')
    },
    armoconsa: {
      sponsorName: 'ARMOCONSA',
      stands: 'Stand 5',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con ARMOCONSA!',
      customSpeech: buildCorporateSpeech('ARMOCONSA', 'Stand 5')
    },
    importaciones_balladares: {
      sponsorName: 'Importaciones Balladares',
      stands: 'Stands 6, 16',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Importaciones Balladares!',
      customSpeech: buildCorporateSpeech('Importaciones Balladares', 'Stands 6, 16')
    },
    balladares: {
      sponsorName: 'Importaciones Balladares',
      stands: 'Stands 6, 16',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Importaciones Balladares!',
      customSpeech: buildCorporateSpeech('Importaciones Balladares', 'Stands 6, 16')
    },
    futec: {
      sponsorName: 'FUTEC',
      stands: 'Stand 7',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con FUTEC!',
      customSpeech: buildCorporateSpeech('FUTEC', 'Stand 7')
    },
    precom_monolit: {
      sponsorName: 'Monolit',
      stands: 'Stands 8, 14',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Monolit!',
      customSpeech: buildCorporateSpeech('Monolit', 'Stands 8, 14')
    },
    monolit: {
      sponsorName: 'Monolit',
      stands: 'Stands 8, 14',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Monolit!',
      customSpeech: buildCorporateSpeech('Monolit', 'Stands 8, 14')
    },
    extel: {
      sponsorName: 'Extel',
      stands: 'Stand 11',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Extel!',
      customSpeech: buildCorporateSpeech('Extel', 'Stand 11')
    },
    sherwin_williams: {
      sponsorName: 'SherwinWilliams',
      stands: 'Stand 12',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con SherwinWilliams!',
      customSpeech: buildCorporateSpeech('SherwinWilliams', 'Stand 12')
    },
    fernandez_sera: {
      sponsorName: 'Fernández Sera',
      stands: 'Stand 13',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Fernández Sera!',
      customSpeech: buildCorporateSpeech('Fernández Sera', 'Stand 13')
    },
    sicsa: {
      sponsorName: 'Sicsa Nicaragua',
      stands: 'Stand 15',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Sicsa Nicaragua!',
      customSpeech: buildCorporateSpeech('Sicsa Nicaragua', 'Stand 15')
    },
    sicsa_nicaragua: {
      sponsorName: 'Sicsa Nicaragua',
      stands: 'Stand 15',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Sicsa Nicaragua!',
      customSpeech: buildCorporateSpeech('Sicsa Nicaragua', 'Stand 15')
    },
    holcim_disensa: {
      sponsorName: 'Holcim (Disensa)',
      stands: 'Stands 17, 18',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Holcim y Disensa!',
      customSpeech: buildCorporateSpeech('Holcim (Disensa)', 'Stands 17, 18')
    },
    holcim: {
      sponsorName: 'Holcim (Disensa)',
      stands: 'Stands 17, 18',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Holcim y Disensa!',
      customSpeech: buildCorporateSpeech('Holcim (Disensa)', 'Stands 17, 18')
    },
    megalineas: {
      sponsorName: 'Megalineas',
      stands: 'Stands 19, 20',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Megalineas!',
      customSpeech: buildCorporateSpeech('Megalineas', 'Stands 19, 20')
    },
    grupo_sur: {
      sponsorName: 'Grupo SUR',
      stands: 'Stand 21',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Grupo SUR y Kermill!',
      customSpeech: buildCorporateSpeech('Grupo SUR', 'Stand 21')
    },
    sur: {
      sponsorName: 'Grupo SUR',
      stands: 'Stand 21',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Grupo SUR y Kermill!',
      customSpeech: buildCorporateSpeech('Grupo SUR', 'Stand 21')
    },
    cemex: {
      sponsorName: 'CEMEX',
      stands: 'Stands 22, 23',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con CEMEX!',
      customSpeech: buildCorporateSpeech('CEMEX', 'Stands 22, 23')
    },
    amanco_wavin: {
      sponsorName: 'AMANCO - WAVIN',
      stands: 'Stand 24',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con AMANCO WAVIN!',
      customSpeech: buildCorporateSpeech('AMANCO - WAVIN', 'Stand 24')
    },
    madinisa: {
      sponsorName: 'Madinisa (Sonax)',
      stands: 'Stand 25',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Madinisa y Sonax!',
      customSpeech: buildCorporateSpeech('Madinisa (Sonax)', 'Stand 25')
    },
    sonax: {
      sponsorName: 'Madinisa (Sonax)',
      stands: 'Stand 25',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Madinisa y Sonax!',
      customSpeech: buildCorporateSpeech('Madinisa (Sonax)', 'Stand 25')
    },
    lafise: {
      sponsorName: 'LAFISE',
      stands: 'Stand 26',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Banco LAFISE!',
      customSpeech: buildCorporateSpeech('LAFISE', 'Stand 26')
    },
    indenicsa: {
      sponsorName: 'Indenicsa',
      stands: 'Stands 27, 28',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Indenicsa!',
      customSpeech: buildCorporateSpeech('Indenicsa', 'Stands 27, 28')
    },
    parques_industriales: {
      sponsorName: 'Parques Industriales',
      stands: 'Stand 29',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Parques Industriales!',
      customSpeech: buildCorporateSpeech('Parques Industriales en Carretera Nueva a León', 'Stand 29')
    },
    plycem: {
      sponsorName: 'Plycem',
      stands: 'Stand 30',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Plycem!',
      customSpeech: buildCorporateSpeech('Plycem', 'Stand 30')
    },
    bac: {
      sponsorName: 'BAC',
      stands: 'Stand 31',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con BAC Credomatic!',
      customSpeech: buildCorporateSpeech('BAC', 'Stand 31')
    },
    casco: {
      sponsorName: 'Casco de Nicaragua',
      stands: 'Stand 32',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Casco de Nicaragua!',
      customSpeech: buildCorporateSpeech('Casco de Nicaragua', 'Stand 32')
    },
    tigo: {
      sponsorName: 'TIGO',
      stands: 'Stand 33',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con TIGO Business!',
      customSpeech: buildCorporateSpeech('TIGO', 'Stand 33')
    },
    incasa: {
      sponsorName: 'INCASA (GRUPO IPSM)',
      stands: 'Stand 34',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con INCASA!',
      customSpeech: buildCorporateSpeech('INCASA (GRUPO IPSM)', 'Stand 34')
    },
    eaton: {
      sponsorName: 'EATON',
      stands: 'Stand 35',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con EATON!',
      customSpeech: buildCorporateSpeech('EATON', 'Stand 35')
    },
    midesa: {
      sponsorName: 'MIDESA',
      stands: 'Stand 37',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con MIDESA!',
      customSpeech: buildCorporateSpeech('MIDESA', 'Stand 37')
    },
    noelito: {
      sponsorName: 'Ferretería Noelito',
      stands: 'Stand 38',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con Ferretería Noelito!',
      customSpeech: buildCorporateSpeech('Ferretería Noelito', 'Stand 38')
    },
    romax: {
      sponsorName: 'ROMAX',
      stands: 'Organizador',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con ROMAX!',
      customSpeech: buildCorporateSpeech('ROMAX', '')
    },
    jp_technology_studio: {
      sponsorName: 'JP Technology Studio',
      stands: 'Organizador',
      customEmailSubject: '¡Sé parte de EXPO FERRE Nicaragua 2026 con JP Technology Studio!',
      customSpeech: buildCorporateSpeech('JP Technology Studio', '')
    }
  };

  const generateDefaultSponsorSpeech = (sponsorName, stands) => {
    return buildCorporateSpeech(sponsorName, stands);
  };

  const getSponsorArt = (sponsorName) => {
    const isGen = !sponsorName || sponsorName === 'general';
    const key = getSponsorKey(sponsorName);
    const setting = sponsorSettings[key] || (key === 'monolit' ? sponsorSettings['precom_monolit'] : {}) || {};
    const official = OFFICIAL_SPONSOR_CONFIGS[key] || (key === 'monolit' ? OFFICIAL_SPONSOR_CONFIGS['precom_monolit'] : {}) || {};
    const calculatedStands = setting.stands || official.stands || (sponsorsMap[sponsorName]?.stands?.join(', ') || '');

    const defaultSpeech = isGen ? '' : generateDefaultSponsorSpeech(sponsorName, calculatedStands);
    const defaultSubject = isGen 
      ? 'Invitación Exclusiva: Acceso Oficial a EXPO FERRE Nicaragua 2026'
      : `¡Sé parte de EXPO FERRE Nicaragua 2026 con ${sponsorName}!`;

    const defaultHeader = '/email-header.png';
    const defaultFooter = '/email-footer.png';

    const header = setting.headerBannerUrl || official.headerBannerUrl || defaultHeader;
    const footer = setting.footerBannerUrl || official.footerBannerUrl || defaultFooter;
    const whatsapp = setting.whatsappBannerUrl || official.whatsappBannerUrl || '';
    const whatsappReminder = setting.whatsappReminderBannerUrl || official.whatsappReminderBannerUrl || whatsapp;

    return {
      headerBannerUrl: header,
      footerBannerUrl: footer,
      whatsappBannerUrl: whatsapp,
      whatsappReminderBannerUrl: whatsappReminder,
      hasCustomHeader: !!(setting.headerBannerUrl || official.headerBannerUrl),
      hasCustomFooter: !!(setting.footerBannerUrl || official.footerBannerUrl),
      hasCustomWhatsapp: !!(setting.whatsappBannerUrl || official.whatsappBannerUrl),
      hasCustomWhatsappReminder: !!(setting.whatsappReminderBannerUrl || official.whatsappReminderBannerUrl),
      customSpeech: setting.customSpeech || official.customSpeech || defaultSpeech,
      customEmailSubject: setting.customEmailSubject || official.customEmailSubject || defaultSubject,
      stands: calculatedStands
    };
  };

  const generateUniqueToken = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `inv_${Date.now().toString(36)}_${rand}`;
  };

  // Crear Invitación Individual
  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const tokenId = generateUniqueToken();
      const inviteRef = doc(db, `${getEventBasePath()}/directInvites`, tokenId);
      const isGen = !guestSponsor || guestSponsor === 'general';
      const spName = isGen ? null : guestSponsor;
      const spArt = spName ? getSponsorArt(spName) : null;

      await setDoc(inviteRef, {
        token: tokenId,
        nombre: guestName.trim() || null,
        empresa: guestCompany.trim() || null,
        email: guestEmail.trim().toLowerCase() || null,
        telefono: guestPhone.trim() || null,
        sponsorId: isGen ? 'general' : getSponsorKey(spName),
        sponsorName: spName,
        sponsorStands: spArt?.stands || null,
        headerBannerUrl: spArt?.headerBannerUrl || null,
        footerBannerUrl: spArt?.footerBannerUrl || null,
        status: 'pending',
        createdBy: adminUser?.email || auth.currentUser?.email || 'admin',
        createdAt: serverTimestamp()
      });

      setGuestName('');
      setGuestCompany('');
      setGuestEmail('');
      setGuestPhone('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error al crear invitación única:', err);
      alert('Error al generar la invitación: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Abrir Modal de Edición de Invitado
  const handleOpenEditGuest = (invite) => {
    setEditModal({ open: true, invite });
    setEditName(invite.nombre || '');
    setEditCompany(invite.empresa || '');
    setEditEmail(invite.email || '');
    setEditPhone(invite.telefono || '');
    setEditSponsor(invite.sponsorName || 'general');
  };

  // Guardar Cambios de Invitado
  const handleSaveEditGuest = async (e) => {
    e.preventDefault();
    if (!editModal.invite) return;
    setIsUpdatingGuest(true);

    try {
      const inviteRef = doc(db, `${getEventBasePath()}/directInvites`, editModal.invite.id);
      const isGen = !editSponsor || editSponsor === 'general';
      const spName = isGen ? null : editSponsor;
      const spArt = spName ? getSponsorArt(spName) : null;

      await updateDoc(inviteRef, {
        nombre: editName.trim() || null,
        empresa: editCompany.trim() || null,
        email: editEmail.trim().toLowerCase() || null,
        telefono: editPhone.trim() || null,
        sponsorId: isGen ? 'general' : getSponsorKey(spName),
        sponsorName: spName,
        sponsorStands: spArt?.stands || null,
        headerBannerUrl: spArt?.headerBannerUrl || null,
        footerBannerUrl: spArt?.footerBannerUrl || null,
        updatedAt: serverTimestamp()
      });

      setEditModal({ open: false, invite: null });
    } catch (err) {
      console.error('Error al actualizar invitado:', err);
      alert('Error al guardar cambios: ' + err.message);
    } finally {
      setIsUpdatingGuest(false);
    }
  };

  // Helper para comprimir imágenes de banners antes de almacenar / previsualizar
  const compressBannerImage = (file, maxWidth = 1200, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper para descargar imagen de arte localmente
  const handleDownloadImage = async (imageUrl, filename = 'Arte_WhatsApp.png') => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn('Fallback direct open for image download:', e);
      window.open(imageUrl, '_blank');
    }
  };

  // Abrir Modal de Configuración de Artes por Patrocinador
  const handleOpenArtModal = (sponsorName) => {
    setIsUploadingHeader(false);
    setIsUploadingFooter(false);
    setIsUploadingWhatsapp(false);
    setIsUploadingWhatsappReminder(false);
    setIsSavingArt(false);

    const key = getSponsorKey(sponsorName);
    const existing = sponsorSettings[key] || {};
    const official = OFFICIAL_SPONSOR_CONFIGS[key] || {};
    const defaultStands = existing.stands || official.stands || sponsorsMap[sponsorName]?.stands?.join(', ') || '';

    setArtModal({
      open: true,
      sponsorKey: key,
      sponsorName: sponsorName === 'general' ? 'Invitación General (ExpoFerre)' : (official.sponsorName || sponsorName),
      stands: defaultStands
    });

    setArtHeaderUrl(existing.headerBannerUrl || official.headerBannerUrl || (sponsorName === 'general' ? 'https://expoferrenicaragua.com/email-header.png' : ''));
    setArtFooterUrl(existing.footerBannerUrl || official.footerBannerUrl || (sponsorName === 'general' ? 'https://expoferrenicaragua.com/email-footer.png' : ''));
    setArtWhatsappBannerUrl(existing.whatsappBannerUrl || official.whatsappBannerUrl || '');
    setArtWhatsappReminderBannerUrl(existing.whatsappReminderBannerUrl || official.whatsappReminderBannerUrl || '');
    setArtStands(defaultStands);
    setArtCustomSpeech(existing.customSpeech || official.customSpeech || '');
    setArtCustomSubject(existing.customEmailSubject || official.customEmailSubject || '');
    setArtTab('banners');
    setArtPreviewChannel('email');
  };

  // Cerrar Modal de Artes con reseteo completo de estados
  const handleCloseArtModal = () => {
    setIsUploadingHeader(false);
    setIsUploadingFooter(false);
    setIsUploadingWhatsapp(false);
    setIsUploadingWhatsappReminder(false);
    setIsSavingArt(false);
    setArtModal({ open: false, sponsorKey: '', sponsorName: '', stands: '' });
  };

  // Subir imagen de banner a Firebase Storage con fallback a Base64 comprimido
  const handleUploadBannerImage = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'header') setIsUploadingHeader(true);
    if (type === 'footer') setIsUploadingFooter(true);
    if (type === 'whatsapp') setIsUploadingWhatsapp(true);
    if (type === 'whatsapp_reminder') setIsUploadingWhatsappReminder(true);

    try {
      // 1. Optimizar imagen localmente y colocar en vista previa de inmediato
      const compressedDataUrl = await compressBannerImage(file, type.startsWith('whatsapp') ? 1080 : 1200, 0.88);
      if (type === 'header') setArtHeaderUrl(compressedDataUrl);
      if (type === 'footer') setArtFooterUrl(compressedDataUrl);
      if (type === 'whatsapp') setArtWhatsappBannerUrl(compressedDataUrl);
      if (type === 'whatsapp_reminder') setArtWhatsappReminderBannerUrl(compressedDataUrl);

      // 2. Intentar subir a Firebase Storage si está disponible con tiempo límite
      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `events/2026/sponsorBanners/${artModal.sponsorKey}_${type}_${Date.now()}.${fileExt}`;
        const imgRef = storageRef(storage, fileName);

        const uploadPromise = uploadBytes(imgRef, file).then(() => getDownloadURL(imgRef));
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Storage timeout')), 10000));
        const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);

        if (downloadUrl) {
          if (type === 'header') setArtHeaderUrl(downloadUrl);
          if (type === 'footer') setArtFooterUrl(downloadUrl);
          if (type === 'whatsapp') setArtWhatsappBannerUrl(downloadUrl);
          if (type === 'whatsapp_reminder') setArtWhatsappReminderBannerUrl(downloadUrl);
        }
      } catch (storageErr) {
        console.warn('Almacenamiento en la nube omitido o falló, se mantendrá versión optimizada:', storageErr);
      }
    } catch (err) {
      console.error('Error al procesar imagen:', err);
      alert('Error al procesar imagen: ' + err.message);
    } finally {
      if (type === 'header') setIsUploadingHeader(false);
      if (type === 'footer') setIsUploadingFooter(false);
      if (type === 'whatsapp') setIsUploadingWhatsapp(false);
      if (type === 'whatsapp_reminder') setIsUploadingWhatsappReminder(false);
      if (e.target) e.target.value = '';
    }
  };

  // Guardar configuración de artes
  const handleSaveSponsorArt = async () => {
    setIsSavingArt(true);
    try {
      const key = artModal.sponsorKey || getSponsorKey(artModal.sponsorName);
      const cleanHeader = artHeaderUrl.trim() || null;
      const cleanFooter = artFooterUrl.trim() || null;
      const cleanWhatsapp = artWhatsappBannerUrl.trim() || null;
      const cleanWhatsappReminder = artWhatsappReminderBannerUrl.trim() || null;
      const cleanStands = artStands.trim() || null;
      const cleanSpeech = artCustomSpeech.trim() || null;
      const cleanSubject = artCustomSubject.trim() || null;

      const settingRef = doc(db, `${getEventBasePath()}/sponsorSettings`, key);
      await setDoc(settingRef, {
        sponsorId: key,
        sponsorName: artModal.sponsorName,
        headerBannerUrl: cleanHeader,
        footerBannerUrl: cleanFooter,
        whatsappBannerUrl: cleanWhatsapp,
        whatsappReminderBannerUrl: cleanWhatsappReminder,
        stands: cleanStands,
        customSpeech: cleanSpeech,
        customEmailSubject: cleanSubject,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser?.email || auth.currentUser?.email || 'admin'
      }, { merge: true });

      // Inmediata actualización reactiva local
      setSponsorSettings(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          id: key,
          sponsorId: key,
          sponsorName: artModal.sponsorName,
          headerBannerUrl: cleanHeader,
          footerBannerUrl: cleanFooter,
          whatsappBannerUrl: cleanWhatsapp,
          whatsappReminderBannerUrl: cleanWhatsappReminder,
          stands: cleanStands,
          customSpeech: cleanSpeech,
          customEmailSubject: cleanSubject
        }
      }));

      handleCloseArtModal();
      alert(`¡Artes de correo, WhatsApp y configuración de "${artModal.sponsorName}" guardados exitosamente!`);
    } catch (err) {
      console.error('Error al guardar artes de patrocinador:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsSavingArt(false);
    }
  };

  // Descargar Plantilla Oficial de Excel
  const handleDownloadTemplateForSponsor = (sponsorName) => {
    import('xlsx').then((XLSX) => {
      const targetSponsor = sponsorName || (selectedSponsorFilter !== 'all' && selectedSponsorFilter !== 'general' ? selectedSponsorFilter : 'SINSA');
      const templateData = [
        {
          Nombre: "Carlos Mendoza",
          Empresa: "Ferretería El Roble",
          Correo: "carlos@ejemplo.com",
          Telefono: "88887777",
          Patrocinador: targetSponsor
        },
        {
          Nombre: "María Silva",
          Empresa: "Distribuidora Central",
          Correo: "maria@ejemplo.com",
          Telefono: "87654321",
          Patrocinador: targetSponsor
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      worksheet['!cols'] = [
        { wch: 25 },
        { wch: 30 },
        { wch: 30 },
        { wch: 20 },
        { wch: 25 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla_Invitados");
      XLSX.writeFile(workbook, `Plantilla_Invitados_${targetSponsor.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    });
  };

  // Disparar carga de archivo para un patrocinador específico
  const handleTriggerUploadForSponsor = (sponsorName) => {
    setTargetedUploadSponsor(sponsorName);
    singleSponsorFileInputRef.current?.click();
  };

  // Helper para hacer coincidir el nombre de una pestaña de Excel con un patrocinador
  const matchSheetToSponsor = (sheetName) => {
    if (!sheetName) return null;
    const clean = sheetName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    
    // Ignorar pestañas genéricas comunes
    if (['hoja 1', 'hoja1', 'sheet 1', 'sheet1', 'datos', 'general', 'invitados', 'contactos', 'resumen'].includes(clean)) {
      return null;
    }

    // 1. Buscar coincidencia exacta o parcial en sponsorsMap
    const allSponsorNames = Object.keys(sponsorsMap);
    for (const sp of allSponsorNames) {
      const cleanSp = sp.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      if (clean === cleanSp || clean.includes(cleanSp) || cleanSp.includes(clean)) {
        return sp;
      }
    }

    // 2. Coincidencias por palabras clave frecuentes
    if (clean.includes('sur')) return 'Grupo Sur';
    if (clean.includes('fernandez') || clean.includes('sera')) return 'Fernandez Sera';
    if (clean.includes('balladares')) return 'Importaciones Balladares Nicaragua';
    if (clean.includes('sicsa') || clean.includes('siccsa')) return 'Sicsa Nicaragua';
    if (clean.includes('sinsa')) return 'Sinsa';
    if (clean.includes('cemex')) return 'CEMEX';
    if (clean.includes('lafise')) return 'LAFISE';
    if (clean.includes('bac')) return 'BAC';
    if (clean.includes('indenicsa')) return 'Indenicsa';
    if (clean.includes('plycem')) return 'Plycem';
    if (clean.includes('casco')) return 'Casco';
    if (clean.includes('midesa')) return 'MIDESA';
    if (clean.includes('noelito')) return 'Ferreteria Noelito';
    if (clean.includes('sherwin')) return 'SherwinWilliams';
    if (clean.includes('armoconsa')) return 'ARMOCONSA';
    if (clean.includes('extel')) return 'Extel';
    if (clean.includes('megalina') || clean.includes('megalinea')) return 'Megalineas';
    if (clean.includes('amanco') || clean.includes('wavin')) return 'AMANCO - WAVIN';
    if (clean.includes('holcim') || clean.includes('disensa')) return 'Holcim (Disensa)';
    if (clean.includes('monolit') || clean.includes('precom')) return 'Monolit';
    if (clean.includes('futec')) return 'FUTEC';
    if (clean.includes('madinisa')) return 'Madinisa';
    if (clean.includes('incasa') || clean.includes('ipsm')) return 'INCASA (GRUPO IPSM)';
    if (clean.includes('eaton')) return 'EATON';
    if (clean.includes('tigo')) return 'TIGO';
    if (clean.includes('parque') || clean.includes('zaratoga') || clean.includes('baratogo') || clean.includes('tucasa')) return 'Parques Industriales en Carretera Nueva a León';
    if (clean.includes('romax') || clean.includes('maximiza')) return 'ROMAX';
    if (clean.includes('jp') || clean.includes('studio') || clean.includes('technology')) return 'JP Technology Studio';

    // 3. Fallback: Usar el nombre de la pestaña limpio
    return sheetName.trim();
  };

  // Procesar archivo Excel/CSV subido (Soporta múltiples pestañas por patrocinador en un solo archivo)
  const handleFileUpload = (e, forcedSponsor = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sponsorTarget = forcedSponsor || targetedUploadSponsor || (selectedSponsorFilter !== 'all' ? selectedSponsorFilter : 'auto');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        let parsedRows = [];
        const isMultiSheetWorkbook = wb.SheetNames.length > 1;

        // Recorrer TODAS las hojas del libro Excel
        for (const wsname of wb.SheetNames) {
          const ws = wb.Sheets[wsname];
          if (!ws) continue;

          // Detectar patrocinador de la pestaña si no está forzado a un sponsor específico
          let detectedSheetSponsor = null;
          if (forcedSponsor) {
            detectedSheetSponsor = forcedSponsor;
          } else if (targetedUploadSponsor) {
            detectedSheetSponsor = targetedUploadSponsor;
          } else {
            detectedSheetSponsor = matchSheetToSponsor(wsname) || (selectedSponsorFilter !== 'all' && selectedSponsorFilter !== 'general' ? selectedSponsorFilter : null);
          }

          // 1. Obtener matriz de filas crudas
          const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (!rawRows || rawRows.length === 0) continue;

          // 2. Buscar fila de cabecera inteligente (primeras 15 filas)
          let headerRowIndex = -1;
          const candidateKeywords = ['nombre', 'name', 'invitado', 'contacto', 'persona', 'cliente', 'destinatario', 'representante', 'empresa', 'company', 'negocio', 'correo', 'email', 'telefono', 'teléfono', 'celular', 'phone'];

          for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
            const rowText = rawRows[r].map(c => String(c).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()).join(' ');
            const matches = candidateKeywords.filter(kw => rowText.includes(kw));
            if (matches.length >= 1) {
              headerRowIndex = r;
              break;
            }
          }

          let sheetParsed = [];

          if (headerRowIndex !== -1) {
            const headers = rawRows[headerRowIndex].map(h => String(h).trim());
            const dataRows = rawRows.slice(headerRowIndex + 1);

            const findColIdx = (candidates) => {
              return headers.findIndex(h => {
                const clean = h.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                return candidates.some(c => clean.includes(c));
              });
            };

            const idxNombre = findColIdx(['nombre', 'name', 'invitado', 'contacto', 'persona', 'cliente', 'destinatario', 'representante', 'titular', 'asistente', 'propietario', 'dueno', 'atencion']);
            const idxEmpresa = findColIdx(['empresa', 'company', 'negocio', 'ferreteria', 'comercial', 'razon social', 'distribuidora', 'establecimiento', 'taller', 'organizacion']);
            const idxCorreo = findColIdx(['correo', 'email', 'mail', 'e-mail', 'electronico', 'direccion']);
            const idxTelefono = findColIdx(['telefono', 'celular', 'phone', 'movil', 'tel', 'ws', 'whatsapp', 'cel', 'numero', 'contacto']);
            const idxPatrocinador = findColIdx(['patrocinador', 'sponsor', 'anfitrion', 'marca', 'proveedor']);

            sheetParsed = dataRows.map((row, index) => {
              const nombre = idxNombre !== -1 ? String(row[idxNombre] || '').trim() : '';
              const empresa = idxEmpresa !== -1 ? String(row[idxEmpresa] || '').trim() : '';
              const correo = idxCorreo !== -1 ? String(row[idxCorreo] || '').trim().toLowerCase() : '';
              const telefono = idxTelefono !== -1 ? String(row[idxTelefono] || '').trim() : '';
              const colPatrocinador = idxPatrocinador !== -1 ? String(row[idxPatrocinador] || '').trim() : '';

              const finalSponsor = colPatrocinador || detectedSheetSponsor || (sponsorTarget !== 'auto' && sponsorTarget !== 'general' ? sponsorTarget : '');

              return {
                sheetName: wsname,
                rowNum: headerRowIndex + index + 2,
                nombre,
                empresa,
                email: correo,
                telefono,
                patrocinador: finalSponsor
              };
            }).filter(r => r.nombre || r.empresa || r.email || r.telefono);
          } else {
            // Heurística de celda
            sheetParsed = rawRows.slice(1).map((row, index) => {
              let emailFound = '';
              let phoneFound = '';
              let textCols = [];

              row.forEach(cell => {
                const str = String(cell).trim();
                if (!str) return;
                if (str.includes('@') && str.includes('.')) {
                  emailFound = str.toLowerCase();
                } else if (/^[+]?[\d\s-]{7,15}$/.test(str.replace(/\s+/g, ''))) {
                  phoneFound = str;
                } else if (str.length > 1) {
                  textCols.push(str);
                }
              });

              const nombre = textCols[0] || '';
              const empresa = textCols[1] || '';
              const finalSponsor = detectedSheetSponsor || (sponsorTarget !== 'auto' && sponsorTarget !== 'general' ? sponsorTarget : '');

              return {
                sheetName: wsname,
                rowNum: index + 2,
                nombre,
                empresa,
                email: emailFound,
                telefono: phoneFound,
                patrocinador: finalSponsor
              };
            }).filter(r => r.nombre || r.empresa || r.email || r.telefono);
          }

          if (sheetParsed.length > 0) {
            parsedRows.push(...sheetParsed);
            // Si el usuario especificó cargar solo para un patrocinador y ya encontramos datos, podemos salir
            if (forcedSponsor && !isMultiSheetWorkbook) {
              break;
            }
          }
        }

        if (parsedRows.length === 0) {
          alert('No se detectaron contactos con datos válidos en ninguna de las pestañas del archivo. Verifica que contengan columnas de Nombre, Empresa, Correo o Teléfono.');
          return;
        }

        setBulkData(parsedRows);
        setBulkTargetSponsor(forcedSponsor || (isMultiSheetWorkbook ? 'auto' : sponsorTarget));
        setShowBulkModal(true);
      } catch (err) {
        console.error('Error al procesar archivo Excel:', err);
        alert('Error al leer el archivo Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
    setTargetedUploadSponsor(null);
  };

  // Guardar Lote de Invitaciones Directas en Firestore con protección inteligente contra duplicados
  const handleConfirmBulkUpload = async () => {
    if (!bulkData || bulkData.length === 0) return;

    const filteredToInsert = skipBulkDuplicates
      ? bulkData.filter(item => !isExistingInvite(item, invites))
      : bulkData;

    const totalToInsert = filteredToInsert.length;
    const totalSkipped = bulkData.length - totalToInsert;

    if (totalToInsert === 0) {
      alert(`Todos los ${bulkData.length} contactos del archivo ya están registrados previamente en el sistema. No se realizaron cambios ni duplicaciones.`);
      setShowBulkModal(false);
      setBulkData([]);
      return;
    }

    setIsBulkSaving(true);
    setBulkProgress({ current: 0, total: totalToInsert });

    try {
      const adminEmail = adminUser?.email || auth.currentUser?.email || 'admin';
      const chunkSize = 400;

      for (let i = 0; i < totalToInsert; i += chunkSize) {
        const chunk = filteredToInsert.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          const tokenId = generateUniqueToken();
          const inviteRef = doc(db, `${getEventBasePath()}/directInvites`, tokenId);
          
          let spName = null;
          if (bulkTargetSponsor && bulkTargetSponsor !== 'auto') {
            spName = bulkTargetSponsor === 'general' ? null : bulkTargetSponsor;
          } else if (item.patrocinador && item.patrocinador.toLowerCase() !== 'general') {
            const matchedKey = Object.keys(sponsorsMap).find(k => k.toLowerCase() === item.patrocinador.toLowerCase());
            spName = matchedKey || item.patrocinador;
          }

          const isGen = !spName || spName === 'general';
          const spArt = spName ? getSponsorArt(spName) : null;

          batch.set(inviteRef, {
            token: tokenId,
            nombre: item.nombre || null,
            empresa: item.empresa || null,
            email: item.email || null,
            telefono: item.telefono || null,
            sponsorId: isGen ? 'general' : getSponsorKey(spName),
            sponsorName: spName,
            sponsorStands: spArt?.stands || null,
            headerBannerUrl: spArt?.headerBannerUrl || null,
            footerBannerUrl: spArt?.footerBannerUrl || null,
            status: 'pending',
            createdBy: adminEmail,
            createdAt: serverTimestamp(),
            isBulkImport: true
          });
        });

        await batch.commit();
        setBulkProgress({ current: Math.min(i + chunkSize, totalToInsert), total: totalToInsert });
      }

      setShowBulkModal(false);
      setBulkData([]);
      
      const successMessage = totalSkipped > 0
        ? `¡Éxito! Se importaron correctamente ${totalToInsert} contactos NUEVOS con enlaces únicos.\n\n🛡️ Se omitieron ${totalSkipped} contactos que ya existían previamente (sus datos, tokens y estados se mantuvieron intactos sin duplicarse).`
        : `¡Éxito! Se generaron correctamente ${totalToInsert} invitaciones directas con enlaces únicos.`;
      
      alert(successMessage);
    } catch (err) {
      console.error('Error al guardar lote de invitaciones:', err);
      alert('Error al procesar la carga masiva: ' + err.message);
    } finally {
      setIsBulkSaving(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  const handleDeleteInvite = async (invite) => {
    const targetName = invite.nombre || invite.empresa || invite.id;
    if (!window.confirm(`¿Estás seguro de eliminar la invitación para "${targetName}"? El enlace quedará deshabilitado permanentemente.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, `${getEventBasePath()}/directInvites`, invite.id));
    } catch (err) {
      console.error('Error al eliminar invitación:', err);
      alert('Error al eliminar: ' + err.message);
    }
  };

  const getInviteUrl = (token) => {
    const host = window.location.hostname;
    const baseUrl = (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168'))
      ? 'https://expoferrenicaragua.com'
      : window.location.origin;
    return `${baseUrl}/?invite=${encodeURIComponent(token)}`;
  };

  // Obtener mensaje corporativo completo para WhatsApp (con patrocinador, stands, evento)
  const getWhatsAppSpeech = (invite) => {
    const link = getInviteUrl(invite.id);
    const guestLabel = invite.nombre?.trim() || '';
    const sponsorName = invite.sponsorName || '';
    const art = sponsorName ? getSponsorArt(sponsorName) : getSponsorArt('general');
    const stands = art.stands || '';

    // Si el usuario configuro un texto personalizado explicito en el modal (no el generico de buildCorporateSpeech)
    const isDefaultCorporate = art.customSpeech && (
      art.customSpeech.includes('Nos complace invitarte a ser parte de la primera edici') ||
      art.customSpeech.includes('Un espacio exclusivo creado para') ||
      art.customSpeech.includes('Hemos reservado para ti un pase exclusivo. Para activar tu acceso')
    );
    if (art.customSpeech && art.customSpeech.trim() && !isDefaultCorporate) {
      let speech = art.customSpeech
        .replace(/{invitado}/g, guestLabel || 'Estimado(a)')
        .replace(/\[Nombre\]/g, guestLabel || 'Estimado(a)')
        .replace(/{empresa_invitada}/g, invite.empresa || '')
        .replace(/{patrocinador}/g, sponsorName)
        .replace(/{stands}/g, stands ? (stands.toLowerCase().startsWith('stand') ? stands : `Stand ${stands}`) : 'nuestro stand');

      if (speech.includes('{enlace}')) {
        speech = speech.replace(/{enlace}/g, link);
      } else {
        speech += `\n\n${link}`;
      }
      return speech;
    }

    // Speech corporativo con patrocinador
    const greeting = guestLabel ? `Hola ${guestLabel},\n\n` : 'Hola,\n\n';
    const standsClean = stands ? (stands.toLowerCase().startsWith('stand') ? stands : `Stand ${stands}`) : '';

    if (sponsorName && sponsorName !== 'general' && sponsorName.toLowerCase() !== 'invitacion general') {
      const standsLine = standsClean ? `Te esperamos en nuestros ${standsClean} para compartir novedades y oportunidades comerciales.\n\n` : '';
      return `${greeting}*${sponsorName}* tiene el agrado de invitarte a la primera edicion de *EXPO FERRE Nicaragua 2026*.\n\n${standsLine}Fecha: 17 de Octubre\nLugar: Centro de Convenciones Crowne Plaza Managua\nHora: 8:00 AM a 5:00 PM\n\nHemos reservado para ti un pase exclusivo. Completa tu registro para generar tu Gafete Oficial con Codigo QR:\n\n${link}\n\nEste enlace es personal e intransferible.\n\nContamos con tu presencia!`;
    }

    // Sin patrocinador (invitacion general)
    return `${greeting}Tienes reservado un pase exclusivo para la primera edicion de *EXPO FERRE Nicaragua 2026*.\n\nFecha: 17 de Octubre\nLugar: Centro de Convenciones Crowne Plaza Managua\nHora: 8:00 AM a 5:00 PM\n\nCompleta tu registro para generar tu Gafete Oficial con Codigo QR:\n\n${link}\n\nEste enlace es personal e intransferible.\n\nContamos con tu presencia!`;
  };

  // Obtener mensaje de recordatorio para WhatsApp (con patrocinador)
  const getWhatsAppReminderSpeech = (invite) => {
    const link = getInviteUrl(invite.id);
    const guestLabel = invite.nombre?.trim() || '';
    const sponsorName = invite.sponsorName || '';
    const art = sponsorName ? getSponsorArt(sponsorName) : getSponsorArt('general');
    const stands = art.stands || '';
    const greeting = guestLabel ? `Hola ${guestLabel},\n\n` : 'Hola,\n\n';
    const standsClean = stands ? (stands.toLowerCase().startsWith('stand') ? stands : `Stand ${stands}`) : '';

    if (sponsorName && sponsorName !== 'general' && sponsorName.toLowerCase() !== 'invitacion general') {
      const cortesia = standsClean ? `por cortesia de *${sponsorName}* (${standsClean})` : `por cortesia de *${sponsorName}*`;
      return `${greeting}Te recordamos que tienes reservado tu pase exclusivo ${cortesia} para *EXPO FERRE Nicaragua 2026*.\n\nFecha: 17 de Octubre\nLugar: Centro de Convenciones Crowne Plaza Managua\nHora: 8:00 AM a 5:00 PM\n\nActiva tu pase completando tu registro:\n\n${link}\n\nEste enlace es personal e intransferible.\n\nContamos con tu presencia!`;
    }

    return `${greeting}Te recordamos que tienes reservado tu pase exclusivo para *EXPO FERRE Nicaragua 2026*.\n\nFecha: 17 de Octubre\nLugar: Centro de Convenciones Crowne Plaza Managua\nHora: 8:00 AM a 5:00 PM\n\nActiva tu pase completando tu registro:\n\n${link}\n\nEste enlace es personal e intransferible.\n\nContamos con tu presencia!`;
  };

  const getWhatsAppUrl = (invite) => {
    const text = encodeURIComponent(getWhatsAppSpeech(invite));
    let phoneClean = (invite.telefono || '').replace(/[^0-9]/g, '');
    if (phoneClean && phoneClean.length === 8) {
      phoneClean = '505' + phoneClean;
    }
    return phoneClean ? `https://wa.me/${phoneClean}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  const getWhatsAppReminderUrl = (invite) => {
    const text = encodeURIComponent(getWhatsAppReminderSpeech(invite));
    let phoneClean = (invite.telefono || '').replace(/[^0-9]/g, '');
    if (phoneClean && phoneClean.length === 8) {
      phoneClean = '505' + phoneClean;
    }
    return phoneClean ? `https://wa.me/${phoneClean}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  const handleCopyWhatsApp = (invite) => {
    const text = getWhatsAppSpeech(invite);
    navigator.clipboard.writeText(text);
    setCopiedToken(`wa_${invite.id}`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleCopyWhatsAppReminder = (invite) => {
    const text = getWhatsAppReminderSpeech(invite);
    navigator.clipboard.writeText(text);
    setCopiedToken(`wa_rem_${invite.id}`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleCopyLinkOnly = (invite) => {
    const link = getInviteUrl(invite.id);
    navigator.clipboard.writeText(link);
    setCopiedToken(`link_${invite.id}`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Función generadora del HTML del correo formal co-brandeado
  const buildInviteEmail = (invite, customRecipientEmail = null, isReminder = false) => {
    const link = getInviteUrl(invite.id);
    const guestLabel = invite.nombre?.trim() || 'Estimado(a) Invitado(a)';
    const sponsorName = invite.sponsorName || '';
    const art = sponsorName ? getSponsorArt(sponsorName) : getSponsorArt('general');
    const rawStands = invite.sponsorStands || art.stands || '';
    const standsClean = rawStands ? (rawStands.toLowerCase().startsWith('stand') ? rawStands : `Stand ${rawStands}`) : '';

    const defaultSubject = isReminder
      ? (sponsorName 
          ? `🔔 Recordatorio: Tu Pase para EXPO FERRE 2026 con ${sponsorName}`
          : '🔔 Recordatorio: Tu Pase Exclusivo para EXPO FERRE Nicaragua 2026')
      : (art.customEmailSubject || (sponsorName 
          ? `¡Sé parte de EXPO FERRE Nicaragua 2026 con ${sponsorName}!`
          : 'Invitación Exclusiva: Acceso Oficial a EXPO FERRE Nicaragua 2026'));

    const subject = isReminder ? (art.customReminderSubject || defaultSubject) : defaultSubject;

    const buttonHtml = `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${link}" style="background-color: #f39200; color: #ffffff; padding: 15px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          🎟️ ${isReminder ? 'Completar Mi Registro y Activar Pase' : 'Activar Mi Pase Exclusivo'}
        </a>
      </div>
    `;

    const noteHtml = `
      <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; color: #92400e;">
          ⚠️ <strong>Nota:</strong> Este enlace es personal, intransferible y de <strong>un solo uso</strong>. Una vez completado tu registro, el enlace se desactivará automáticamente.
        </p>
      </div>
    `;

    let bodyContentHtml = '';

    if (isReminder) {
      bodyContentHtml = `
        <h2 style="color: #0d47a1; margin-top: 0; font-size: 22px;">¡Recordatorio de Invitación, ${guestLabel}! 🔔</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
          Te escribimos para recordarte que tienes reservado tu <strong>pase exclusivo</strong> ${sponsorName ? `por cortesía de <strong>${sponsorName}</strong>` : 'de la organización oficial'} para la primera edición de <strong>EXPO FERRE Nicaragua 2026</strong>.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
          Aún estás a tiempo de confirmar tu asistencia y recibir tu <strong>Gafete Oficial con Código QR</strong> para ingresar de manera preferencial y sin filas.
        </p>

        ${buttonHtml}
        ${noteHtml}

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; text-align: left;">
          <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📅 <strong>Fecha:</strong> 17 de Octubre, 2026</p>
          <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📍 <strong>Lugar:</strong> Centro de Convenciones Crowne Plaza Managua.</p>
          <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">⏰ <strong>Hora:</strong> 8:00 AM a 5:00 PM (Registro desde 7:00 AM)</p>
          ${sponsorName && standsClean ? `<p style="margin: 4px 0; font-size: 13px; color: #d97706;">🏢 <strong>Stand Anfitrión:</strong> ${standsClean} (${sponsorName})</p>` : ''}
        </div>

        <p style="font-size: 15px; font-weight: bold; color: #0d47a1; margin-top: 28px;">
          ¡Contamos con tu valiosa presencia! 🚀
        </p>
      `;
    } else if (art.customSpeech && art.customSpeech.trim()) {
      let speechFormatted = art.customSpeech
        .replace(/{invitado}/g, guestLabel)
        .replace(/\[Nombre\]/g, guestLabel)
        .replace(/{empresa_invitada}/g, invite.empresa || '')
        .replace(/{patrocinador}/g, sponsorName)
        .replace(/{stands}/g, standsClean || 'nuestro stand');

      if (speechFormatted.includes('{enlace}')) {
        speechFormatted = speechFormatted.replace(/{enlace}/g, buttonHtml);
      } else {
        speechFormatted += `\n\n${buttonHtml}\n\n${noteHtml}`;
      }

      const paragraphs = speechFormatted.split('\n\n');
      bodyContentHtml = paragraphs.map(p => {
        if (p.includes(buttonHtml) || p.includes(noteHtml)) {
          return p;
        }
        if (p.includes('📅') || p.includes('📍') || p.includes('⏰') || p.includes('🏢')) {
          const lines = p.split('\n').map(l => `<p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">${l}</p>`).join('');
          return `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; text-align: left; margin: 18px 0;">${lines}</div>`;
        }
        return `<p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 14px;">${p.replace(/\n/g, '<br/>')}</p>`;
      }).join('');
    } else {
      bodyContentHtml = `
        <h2 style="color: #0d47a1; margin-top: 0; font-size: 22px;">¡Hola ${guestLabel}!</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
          ${sponsorName 
            ? `Te saludamos cordialmente en nombre de <strong>${sponsorName}</strong> y el comité organizador de <strong>EXPO FERRE Nicaragua 2026</strong>.`
            : 'Te saludamos en nombre del comité organizador de <strong>EXPO FERRE Nicaragua 2026</strong>.'}
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
          ${sponsorName && standsClean 
            ? `Tenemos el agrado de invitarte de forma exclusiva para que nos acompañes y conozcas nuestras últimas innovaciones en el <strong>${standsClean}</strong>.`
            : 'Es un gusto saludarte y extenderte una invitación especial y personalizada para ser parte del encuentro más importante de la industria ferretera y de la construcción en el país.'}
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
          Hemos reservado para ti un <strong>pase preferencial de acceso</strong>. Para activar tu acceso y recibir tu Gafete Oficial con Código QR, por favor completa tu registro ingresando al botón que encontrarás abajo:
        </p>

        ${buttonHtml}
        ${noteHtml}

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; text-align: left;">
          <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📅 <strong>Fecha:</strong> 17 de Octubre, 2026</p>
          <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📍 <strong>Lugar:</strong> Centro de Convenciones Crowne Plaza Managua.</p>
          <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">⏰ <strong>Hora:</strong> 8:00 AM a 5:00 PM (Registro desde 7:00 AM)</p>
          ${sponsorName && standsClean ? `<p style="margin: 4px 0; font-size: 13px; color: #d97706;">🏢 <strong>Stand Anfitrión:</strong> ${standsClean} (${sponsorName})</p>` : ''}
        </div>

        <p style="font-size: 15px; font-weight: bold; color: #0d47a1; margin-top: 28px;">
          ¡Será un verdadero honor contar con tu presencia! 🚀
        </p>
      `;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <img src="${art.headerBannerUrl}" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
        
        <div style="padding: 32px 24px;">
          ${bodyContentHtml}
          
          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; word-break: break-all;">
            Si el botón no abre, copia y pega este enlace en tu navegador:<br/>
            <a href="${link}" style="color: #0d47a1;">${link}</a>
          </p>
        </div>
        
        <img src="${art.footerBannerUrl}" alt="Marcas ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
      </div>
    `;

    return { subject, html, recipientEmail: customRecipientEmail || invite.email };
  };

  // Enviar correo individual
  const handleSendEmailDirect = async (e) => {
    e.preventDefault();
    const invite = emailModal.invite;
    if (!invite || !invite.targetEmail?.trim()) return;

    setIsSendingEmail(true);
    setEmailSuccess('');

    try {
      const { subject, html } = buildInviteEmail(invite, invite.targetEmail.trim());

      await addDoc(collection(db, 'mail'), {
        to: invite.targetEmail.trim(),
        message: {
          subject: subject,
          html: html
        }
      });

      // Actualizar documento de invitación
      await updateDoc(doc(db, `${getEventBasePath()}/directInvites`, invite.id), {
        emailSent: true,
        emailSentAt: serverTimestamp(),
        lastEmailTo: invite.targetEmail.trim(),
        emailSendCount: (invite.emailSendCount || 0) + 1
      });

      setEmailSuccess(`¡Invitación enviada con éxito a ${invite.targetEmail}!`);
      setTimeout(() => {
        setEmailModal({ open: false, invite: null });
        setEmailSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error al enviar correo:', err);
      alert('Hubo un error al enviar el correo: ' + err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Abrir Modal de Envío Masivo de Correos
  const handleOpenBulkEmailModal = (sponsorName, defaultFilterType = 'never_sent') => {
    const isGen = !sponsorName || sponsorName === 'general';
    setBulkEmailModal({
      open: true,
      sponsorName: isGen ? 'general' : sponsorName,
      sponsorDisplayName: isGen ? 'Invitación General (ExpoFerre)' : sponsorName,
      filterType: defaultFilterType,
      batchLimit: 'all',
      paceSpeed: 'safe'
    });
    setBulkEmailResult(null);
    setBulkEmailProgress({ current: 0, total: 0, failed: 0, stopped: false });
    cancelBulkEmailRef.current = false;
  };

  // Detener Envío Masivo en Curso
  const handleStopBulkEmail = () => {
    cancelBulkEmailRef.current = true;
  };

  // Ejecutar Envío Masivo de Correos con Pacing Antispam y Lotes
  const handleExecuteBulkEmail = async () => {
    const targetSp = bulkEmailModal.sponsorName;
    const filterType = bulkEmailModal.filterType;
    const batchLimit = bulkEmailModal.batchLimit;
    const paceSpeed = bulkEmailModal.paceSpeed || 'safe';
    
    // Pacing delay (ms)
    const delayMs = paceSpeed === 'safe' ? 250 : paceSpeed === 'normal' ? 120 : 40;

    const isReminderMode = filterType === 'unregistered_reminder' || filterType === 'only_already_sent_reminders';

    // Filtrar destinatarios válidos y separar correos con sintaxis válida
    let targets = invites.filter(inv => {
      // 1. Validar patrocinador
      if (targetSp === 'general') {
        if (inv.sponsorName && inv.sponsorId !== 'general' && getSponsorKey(inv.sponsorName) !== 'general') return false;
      } else if (targetSp !== 'all') {
        if (!isMatchingSponsor(inv.sponsorName, targetSp) && inv.sponsorId !== getSponsorKey(targetSp)) return false;
      }
      
      // 2. Debe tener correo electrónico y sintaxis válida
      const email = (inv.email || '').trim();
      if (!isValidEmailAddress(email)) return false;

      // 3. Debe estar en estado pendiente (no registrado)
      if (inv.status === 'used') return false;

      // 4. Si el filtro es solo nunca enviados
      if (filterType === 'never_sent' && inv.emailSentAt) {
        return false;
      }

      // 5. Si el filtro es solo los que ya recibieron correo previo
      if (filterType === 'only_already_sent_reminders' && !inv.emailSentAt) {
        return false;
      }

      return true;
    });

    if (targets.length === 0) {
      alert('No se encontraron invitados pendientes con correo electrónico válido para procesar según el filtro seleccionado.');
      return;
    }

    // Aplicar límite por lote si está seleccionado
    if (batchLimit !== 'all') {
      const limitNum = parseInt(batchLimit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        targets = targets.slice(0, limitNum);
      }
    }

    cancelBulkEmailRef.current = false;
    setIsBulkSendingEmail(true);
    setBulkEmailProgress({ current: 0, total: targets.length, failed: 0, stopped: false });
    setBulkEmailResult(null);

    let sentCount = 0;
    let failCount = 0;
    const failedList = [];
    let wasStopped = false;

    try {
      for (let i = 0; i < targets.length; i++) {
        // Verificar si el usuario solicitó detener
        if (cancelBulkEmailRef.current) {
          wasStopped = true;
          break;
        }

        const inv = targets[i];
        const targetEmail = inv.email.trim().toLowerCase();

        try {
          const { subject, html } = buildInviteEmail(inv, null, isReminderMode);

          // 1. Encolar correo en la colección 'mail' de Firestore
          await addDoc(collection(db, 'mail'), {
            to: targetEmail,
            message: {
              subject,
              html
            }
          });

          // 2. Actualizar documento de invitación
          await updateDoc(doc(db, `${getEventBasePath()}/directInvites`, inv.id), {
            emailSent: true,
            emailSentAt: serverTimestamp(),
            lastEmailTo: targetEmail,
            emailSendCount: (inv.emailSendCount || 0) + 1
          });

          sentCount++;
        } catch (err) {
          console.error(`Error enviando correo a ${targetEmail}:`, err);
          failCount++;
          failedList.push({
            name: inv.nombre || 'Sin nombre',
            email: targetEmail,
            company: inv.empresa || '',
            error: err.message
          });
        }

        setBulkEmailProgress({ current: i + 1, total: targets.length, failed: failCount, stopped: wasStopped });

        // Pausa de protección antispam entre despachos
        if (i < targets.length - 1 && !cancelBulkEmailRef.current) {
          await sleep(delayMs);
        }
      }

      setBulkEmailResult({
        success: true,
        total: targets.length,
        sent: sentCount,
        failed: failCount,
        failedList: failedList,
        wasStopped
      });
    } catch (err) {
      console.error('Error durante el envío masivo de correos:', err);
      alert('Ocurrió un error inesperado: ' + err.message);
    } finally {
      setIsBulkSendingEmail(false);
    }
  };

  // -------------------------------------------------------------
  // CONTROLADORES DE WATI WHATSAPP API (INDIVIDUAL & MASIVO)
  // -------------------------------------------------------------

  // Enviar invitación individual automática por WATI (1-Click)
  const handleSendSingleWati = async (invite) => {
    if (!invite || !invite.telefono) {
      alert('El invitado no tiene un número de teléfono registrado.');
      return;
    }

    const phoneValidation = cleanPhoneNumber(invite.telefono);
    if (!phoneValidation.isValid) {
      alert(`El número "${invite.telefono}" no tiene un formato válido (debe tener al menos 8 dígitos).`);
      return;
    }

    setIsSendingWatiId(invite.id);
    setWatiNotification(null);

    try {
      const inviteUrl = getInviteUrl(invite.id);
      const sponsorName = invite.sponsorName || 'general';

      const res = await sendDirectInviteViaWati({
        invite,
        sponsorName,
        inviteUrl
      });

      if (res.success) {
        await updateDoc(doc(db, `${getEventBasePath()}/directInvites`, invite.id), {
          whatsappSent: true,
          whatsappSentAt: serverTimestamp(),
          whatsappSentVia: 'wati',
          whatsappPhone: res.phone,
          whatsappSendCount: (invite.whatsappSendCount || 0) + 1
        });

        setWatiNotification({
          type: 'success',
          message: `¡Invitación enviada por WATI con éxito a ${res.phone} (${invite.nombre || 'Invitado'})!`
        });
        setTimeout(() => setWatiNotification(null), 4000);
      } else {
        alert(`No se pudo enviar el mensaje por WATI:\n${res.error}\n\n(Aviso: Si la plantilla sigue en revisión por Meta, el mensaje no saldrá hasta que sea APROBADA).`);
      }
    } catch (err) {
      console.error('Error al enviar WhatsApp Wati:', err);
      alert('Error inesperado al conectar con Wati: ' + err.message);
    } finally {
      setIsSendingWatiId(null);
    }
  };

  // Abrir Modal de Envío Masivo de WhatsApp por WATI (por Patrocinador)
  const handleOpenBulkWatiModal = (sponsorName) => {
    const isGen = !sponsorName || sponsorName === 'general';
    setBulkWatiModal({
      open: true,
      sponsorName: isGen ? 'general' : sponsorName,
      sponsorDisplayName: isGen ? 'Invitación General (ExpoFerre)' : sponsorName,
      filterType: 'never_sent',
      batchLimit: 'all',
      paceSpeed: 'safe'
    });
    setBulkWatiResult(null);
    setBulkWatiProgress({ current: 0, total: 0, failed: 0, stopped: false });
    cancelBulkWatiRef.current = false;
  };

  // Detener Envío Masivo Wati en curso
  const handleStopBulkWati = () => {
    cancelBulkWatiRef.current = true;
  };

  // Ejecutar Envío Masivo de WhatsApp a través de WATI
  const handleExecuteBulkWati = async () => {
    const targetSp = bulkWatiModal.sponsorName;
    const filterType = bulkWatiModal.filterType;
    const batchLimit = bulkWatiModal.batchLimit;
    const paceSpeed = bulkWatiModal.paceSpeed || 'safe';
    
    // Intervalo de seguridad entre mensajes (1000ms safe, 600ms normal)
    const delayMs = paceSpeed === 'safe' ? 1000 : 600;

    let targets = invites.filter(inv => {
      // 1. Filtrar patrocinador
      if (targetSp === 'general') {
        if (inv.sponsorName && inv.sponsorId !== 'general' && getSponsorKey(inv.sponsorName) !== 'general') return false;
      } else if (targetSp !== 'all') {
        if (!isMatchingSponsor(inv.sponsorName, targetSp) && inv.sponsorId !== getSponsorKey(targetSp)) return false;
      }

      // 2. Debe tener teléfono válido
      const phoneValidation = cleanPhoneNumber(inv.telefono);
      if (!phoneValidation.isValid) return false;

      // 3. Debe estar pendiente (no registrado)
      if (inv.status === 'used') return false;

      // 4. Filtro: solo nunca enviados
      if (filterType === 'never_sent' && (inv.whatsappSent || inv.whatsappSentAt)) {
        return false;
      }

      return true;
    });

    if (targets.length === 0) {
      alert('No se encontraron invitados pendientes con número de WhatsApp válido para procesar.');
      return;
    }

    if (batchLimit !== 'all') {
      const limitNum = parseInt(batchLimit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        targets = targets.slice(0, limitNum);
      }
    }

    cancelBulkWatiRef.current = false;
    setIsBulkSendingWati(true);
    setBulkWatiProgress({ current: 0, total: targets.length, failed: 0, stopped: false });
    setBulkWatiResult(null);

    let sentCount = 0;
    let failCount = 0;
    const failedList = [];
    let wasStopped = false;

    try {
      for (let i = 0; i < targets.length; i++) {
        if (cancelBulkWatiRef.current) {
          wasStopped = true;
          break;
        }

        const inv = targets[i];
        const inviteUrl = getInviteUrl(inv.id);
        const sponsorName = inv.sponsorName || targetSp;

        try {
          const res = await sendDirectInviteViaWati({
            invite,
            sponsorName,
            inviteUrl
          });

          if (res.success) {
            await updateDoc(doc(db, `${getEventBasePath()}/directInvites`, inv.id), {
              whatsappSent: true,
              whatsappSentAt: serverTimestamp(),
              whatsappSentVia: 'wati',
              whatsappPhone: res.phone,
              whatsappSendCount: (inv.whatsappSendCount || 0) + 1
            });
            sentCount++;
          } else {
            failCount++;
            failedList.push({
              name: inv.nombre || 'Sin nombre',
              phone: inv.telefono || 'Sin teléfono',
              company: inv.empresa || '',
              error: res.error || 'Fallo de entrega Wati'
            });
          }
        } catch (err) {
          failCount++;
          failedList.push({
            name: inv.nombre || 'Sin nombre',
            phone: inv.telefono || 'Sin teléfono',
            company: inv.empresa || '',
            error: err.message
          });
        }

        setBulkWatiProgress({ current: i + 1, total: targets.length, failed: failCount, stopped: wasStopped });

        if (i < targets.length - 1 && !cancelBulkWatiRef.current) {
          await sleep(delayMs);
        }
      }

      setBulkWatiResult({
        success: true,
        total: targets.length,
        sent: sentCount,
        failed: failCount,
        failedList,
        wasStopped
      });
    } catch (globalErr) {
      console.error('Error durante el envío masivo por Wati:', globalErr);
      alert('Ocurrió un error inesperado durante el envío masivo: ' + globalErr.message);
    } finally {
      setIsBulkSendingWati(false);
    }
  };

  // Exportar Excel de lista actual (Respeta el filtro de patrocinador seleccionado)
  const handleExportExcel = (targetSponsor = null) => {
    const spFilter = targetSponsor || selectedSponsorFilter;
    
    const dataToFilter = invites.filter(inv => {
      if (spFilter === 'general') return !inv.sponsorName || inv.sponsorId === 'general' || getSponsorKey(inv.sponsorName) === 'general';
      if (spFilter !== 'all') return isMatchingSponsor(inv.sponsorName, spFilter) || (inv.sponsorId && inv.sponsorId === getSponsorKey(spFilter));
      return true;
    });

    import('xlsx').then((XLSX) => {
      const dataToExport = dataToFilter.map((inv) => ({
        Fecha_Creacion: inv.createdAt?.toLocaleDateString ? inv.createdAt.toLocaleDateString() + ' ' + inv.createdAt.toLocaleTimeString() : 'N/A',
        Token_ID: inv.id,
        Invitado_Nombre: inv.nombre || 'N/A',
        Empresa_Invitada: inv.empresa || 'N/A',
        Correo: inv.email || 'N/A',
        Telefono: inv.telefono || 'N/A',
        Patrocinador_Anfitrion: inv.sponsorName || 'Invitación General',
        Stands_Patrocinador: inv.sponsorStands || 'N/A',
        Estado: inv.status === 'used' ? 'REGISTRADO (USADO)' : 'PENDIENTE (DISPONIBLE)',
        Registrado_Nombre: inv.registeredName || '',
        Registrado_Empresa: inv.registeredCompany || '',
        Registrado_Email: inv.registeredEmail || '',
        Registrado_Telefono: inv.registeredPhone || '',
        Fecha_Uso: inv.usedAt ? (typeof inv.usedAt.toLocaleDateString === 'function' ? inv.usedAt.toLocaleDateString() + ' ' + inv.usedAt.toLocaleTimeString() : new Date(inv.usedAt).toLocaleString()) : '',
        Enlace_Unico: getInviteUrl(inv.id)
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      const sheetName = spFilter !== 'all' ? spFilter.substring(0, 30) : 'Invitaciones_Directas';
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `Invitaciones_${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}_ExpoFerre_2026.xlsx`);
    });
  };

  // Exportar Informe Ejecutivo Completo Multi-Hoja en Excel
  const handleExportExecutiveReport = () => {
    import('xlsx').then((XLSX) => {
      // 1. Hoja 1: Resumen por Patrocinador y Totales Globales
      const summaryRows = [];

      // Fila: General
      const genInv = invites.filter(i => !i.sponsorName || i.sponsorId === 'general' || getSponsorKey(i.sponsorName) === 'general');
      const genUsed = genInv.filter(i => i.status === 'used').length;
      const genPending = genInv.length - genUsed;
      const genWithEmail = genInv.filter(i => isValidEmailAddress(i.email)).length;
      const genSent = genInv.filter(i => i.emailSent || i.emailSentAt).length;
      const genUnsent = genInv.filter(i => isValidEmailAddress(i.email) && !i.emailSentAt && i.status === 'pending').length;
      const genNoEmail = genInv.length - genWithEmail;
      const genCoveragePct = genWithEmail > 0 ? Math.round((genSent / genWithEmail) * 100) : 0;
      const genConversionPct = genInv.length > 0 ? Math.round((genUsed / genInv.length) * 100) : 0;
      const genArt = getSponsorArt('general');

      summaryRows.push({
        Patrocinador: 'Invitación General (Comité EXPO FERRE 2026)',
        Stands: 'Evento General',
        Total_Invitados: genInv.length,
        Correos_Enviados: genSent,
        Correos_Pendientes_Envio: genUnsent,
        Sin_Correo_Valido_WhatsApp_Only: genNoEmail,
        Cobertura_Envios_Pct: `${genCoveragePct}%`,
        Registrados_Gafetes_Emitidos: genUsed,
        Pendientes_Completar_Registro: genPending,
        Tasa_Efectividad_Registro_Pct: `${genConversionPct}%`,
        Header_Personalizado: genArt.hasCustomHeader ? 'SÍ' : 'NO (Default)',
        Footer_Personalizado: genArt.hasCustomFooter ? 'SÍ' : 'NO (Default)',
        Speech_Personalizado: (sponsorSettings['general']?.customSpeech || '').trim() ? 'SÍ' : 'NO (Default)'
      });

      // Filas de cada Patrocinador
      sponsorsList.forEach((sp) => {
        const spInvites = invites.filter(i => isMatchingSponsor(i.sponsorName, sp) || (i.sponsorId && i.sponsorId === getSponsorKey(sp)));
        const spUsed = spInvites.filter(i => i.status === 'used').length;
        const spPending = spInvites.length - spUsed;
        const spWithEmail = spInvites.filter(i => isValidEmailAddress(i.email)).length;
        const spSent = spInvites.filter(i => i.emailSent || i.emailSentAt).length;
        const spUnsent = spInvites.filter(i => isValidEmailAddress(i.email) && !i.emailSentAt && i.status === 'pending').length;
        const spNoEmail = spInvites.length - spWithEmail;
        const spCoveragePct = spWithEmail > 0 ? Math.round((spSent / spWithEmail) * 100) : 0;
        const spConversionPct = spInvites.length > 0 ? Math.round((spUsed / spInvites.length) * 100) : 0;
        const art = getSponsorArt(sp);
        const rawStands = sponsorsMap[sp]?.stands?.join(', ') || art.stands || 'N/A';
        const cleanStands = rawStands.replace(/stand\s*/gi, '').trim();

        summaryRows.push({
          Patrocinador: sp,
          Stands: cleanStands ? `Stand ${cleanStands}` : 'N/A',
          Total_Invitados: spInvites.length,
          Correos_Enviados: spSent,
          Correos_Pendientes_Envio: spUnsent,
          Sin_Correo_Valido_WhatsApp_Only: spNoEmail,
          Cobertura_Envios_Pct: `${spCoveragePct}%`,
          Registrados_Gafetes_Emitidos: spUsed,
          Pendientes_Completar_Registro: spPending,
          Tasa_Efectividad_Registro_Pct: `${spConversionPct}%`,
          Header_Personalizado: art.hasCustomHeader ? 'SÍ' : 'NO (Default)',
          Footer_Personalizado: art.hasCustomFooter ? 'SÍ' : 'NO (Default)',
          Speech_Personalizado: (sponsorSettings[getSponsorKey(sp)]?.customSpeech || '').trim() ? 'SÍ' : 'NO (Default)'
        });
      });

      // Fila Final de Totales Globales
      const globalEffectiveRate = totalInvitesCount > 0 ? Math.round((totalUsedCount / totalInvitesCount) * 100) : 0;
      summaryRows.push({
        Patrocinador: '=== TOTALES GLOBALES ===',
        Stands: '35 Stands Reservados',
        Total_Invitados: totalInvitesCount,
        Correos_Enviados: totalEmailsSent,
        Correos_Pendientes_Envio: totalEmailsPending,
        Sin_Correo_Valido_WhatsApp_Only: totalWithoutValidEmail,
        Cobertura_Envios_Pct: `${emailCoveragePercent}%`,
        Registrados_Gafetes_Emitidos: totalUsedCount,
        Pendientes_Completar_Registro: totalPendingCount,
        Tasa_Efectividad_Registro_Pct: `${globalEffectiveRate}%`,
        Header_Personalizado: '-',
        Footer_Personalizado: '-',
        Speech_Personalizado: '-'
      });

      // 2. Hoja 2: Detalle Individual Completo de todos los Invitados
      const detailRows = invites.map((inv, idx) => {
        const hasSent = inv.emailSent || inv.emailSentAt;
        const isUsed = inv.status === 'used';
        return {
          No: idx + 1,
          Token_ID: inv.id,
          Patrocinador_Asignado: inv.sponsorName || 'Invitación General',
          Stands_Patrocinador: inv.sponsorStands || 'N/A',
          Nombre_Destinatario: inv.nombre || 'N/A',
          Empresa_Destinataria: inv.empresa || 'N/A',
          Correo_Electronico: inv.email || 'N/A',
          Telefono_WhatsApp: inv.telefono || 'N/A',
          Estado_Invitacion: isUsed ? 'REGISTRADO (GAFETE EMITIDO)' : 'PENDIENTE DE REGISTRO',
          Correo_Despachado: hasSent ? 'ENVIADO' : (isValidEmailAddress(inv.email) ? 'PENDIENTE DE ENVIO' : 'SIN CORREO VALIDO'),
          Cantidad_Envios_Correo: inv.emailSentCount || (hasSent ? 1 : 0),
          Fecha_Ultimo_Envio: inv.emailSentAt ? (typeof inv.emailSentAt.toDate === 'function' ? inv.emailSentAt.toDate().toLocaleString('es-NI') : new Date(inv.emailSentAt).toLocaleString('es-NI')) : 'No enviado',
          Nombre_Registrado_Gafete: inv.registeredName || '',
          Empresa_Registrada_Gafete: inv.registeredCompany || '',
          Email_Registrado_Gafete: inv.registeredEmail || '',
          Telefono_Registrado_Gafete: inv.registeredPhone || '',
          Fecha_Registro_Gafete: inv.usedAt ? (typeof inv.usedAt.toLocaleDateString === 'function' ? inv.usedAt.toLocaleDateString('es-NI') + ' ' + inv.usedAt.toLocaleTimeString('es-NI') : new Date(inv.usedAt).toLocaleString('es-NI')) : '',
          Enlace_Unico_QR: getInviteUrl(inv.id)
        };
      });

      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      const wsDetail = XLSX.utils.json_to_sheet(detailRows);

      // Auto-ajustar anchos aproximados de columnas
      wsSummary['!cols'] = [
        { wch: 35 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 24 },
        { wch: 30 }, { wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 28 },
        { wch: 22 }, { wch: 22 }, { wch: 22 }
      ];

      wsDetail['!cols'] = [
        { wch: 6 }, { wch: 24 }, { wch: 30 }, { wch: 20 }, { wch: 28 },
        { wch: 28 }, { wch: 30 }, { wch: 18 }, { wch: 28 }, { wch: 22 },
        { wch: 22 }, { wch: 24 }, { wch: 28 }, { wch: 28 }, { wch: 30 },
        { wch: 20 }, { wch: 24 }, { wch: 45 }
      ];

      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen_Por_Patrocinador");
      XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle_General_Invitados");

      const nowStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Informe_Ejecutivo_Invitaciones_ExpoFerre_${nowStr}.xlsx`);
    });
  };

  // Filtrar Invitaciones para la vista detallada
  const filteredInvites = invites.filter(inv => {
    const term = searchTerm.toLowerCase().trim();
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    let matchesSponsor = true;
    if (selectedSponsorFilter === 'general') {
      matchesSponsor = !inv.sponsorName || inv.sponsorId === 'general' || getSponsorKey(inv.sponsorName) === 'general';
    } else if (selectedSponsorFilter !== 'all') {
      matchesSponsor = isMatchingSponsor(inv.sponsorName, selectedSponsorFilter) || (inv.sponsorId && inv.sponsorId === getSponsorKey(selectedSponsorFilter));
    }

    if (!matchesStatus || !matchesSponsor) return false;
    if (!term) return true;

    const name = (inv.nombre || '').toLowerCase();
    const comp = (inv.empresa || '').toLowerCase();
    const mail = (inv.email || '').toLowerCase();
    const sp = (inv.sponsorName || '').toLowerCase();
    const regName = (inv.registeredName || '').toLowerCase();
    const regComp = (inv.registeredCompany || '').toLowerCase();
    const token = inv.id.toLowerCase();

    return name.includes(term) || comp.includes(term) || mail.includes(term) || sp.includes(term) || regName.includes(term) || regComp.includes(term) || token.includes(term);
  });

  const sponsorsList = Object.keys(sponsorsMap).sort();

  // Conteo de patrocinadores según criterios para los chips de filtro
  const countSponsorsWithInvites = sponsorsList.filter(sp => {
    return invites.some(i => isMatchingSponsor(i.sponsorName, sp) || (i.sponsorId && i.sponsorId === getSponsorKey(sp)));
  }).length + (invites.some(i => !i.sponsorName || i.sponsorId === 'general') ? 1 : 0);

  const countSponsorsWithRegistered = sponsorsList.filter(sp => {
    return invites.some(i => (isMatchingSponsor(i.sponsorName, sp) || (i.sponsorId && i.sponsorId === getSponsorKey(sp))) && i.status === 'used');
  }).length + (invites.some(i => (!i.sponsorName || i.sponsorId === 'general') && i.status === 'used') ? 1 : 0);

  const countSponsorsWithPending = sponsorsList.filter(sp => {
    return invites.some(i => (isMatchingSponsor(i.sponsorName, sp) || (i.sponsorId && i.sponsorId === getSponsorKey(sp))) && i.status === 'pending');
  }).length + (invites.some(i => (!i.sponsorName || i.sponsorId === 'general') && i.status === 'pending') ? 1 : 0);

  const countSponsorsWithUnsentEmails = sponsorsList.filter(sp => {
    return invites.some(i => (isMatchingSponsor(i.sponsorName, sp) || (i.sponsorId && i.sponsorId === getSponsorKey(sp))) && i.status === 'pending' && isValidEmailAddress(i.email) && !i.emailSentAt);
  }).length + (invites.some(i => (!i.sponsorName || i.sponsorId === 'general') && i.status === 'pending' && isValidEmailAddress(i.email) && !i.emailSentAt) ? 1 : 0);

  // Filtrar lista de patrocinadores para el directorio (Búsqueda + Filtro de Estado)
  const filteredSponsorsList = sponsorsList.filter(sp => {
    const term = sponsorSearchTerm.toLowerCase().trim();
    const stands = (sponsorsMap[sp]?.stands || []).join(' ').toLowerCase();
    const matchesSearch = !term || sp.toLowerCase().includes(term) || stands.includes(term);
    if (!matchesSearch) return false;

    const spInvites = invites.filter(i => isMatchingSponsor(i.sponsorName, sp) || (i.sponsorId && i.sponsorId === getSponsorKey(sp)));
    if (sponsorFilterStatus === 'has_invites') return spInvites.length > 0;
    if (sponsorFilterStatus === 'has_registered') return spInvites.some(i => i.status === 'used');
    if (sponsorFilterStatus === 'has_pending') return spInvites.some(i => i.status === 'pending');
    if (sponsorFilterStatus === 'has_unsent_emails') return spInvites.some(i => i.status === 'pending' && isValidEmailAddress(i.email) && !i.emailSentAt);

    return true;
  });

  // Visibilidad de la fila Especial General según filtros
  const showGeneralRow = (() => {
    const term = sponsorSearchTerm.toLowerCase().trim();
    const matchesSearch = !term || 'invitacion general expoferre karen torres'.includes(term);
    if (!matchesSearch) return false;

    const genInv = invites.filter(i => !i.sponsorName || i.sponsorId === 'general' || getSponsorKey(i.sponsorName) === 'general');
    if (sponsorFilterStatus === 'has_invites') return genInv.length > 0;
    if (sponsorFilterStatus === 'has_registered') return genInv.some(i => i.status === 'used');
    if (sponsorFilterStatus === 'has_pending') return genInv.some(i => i.status === 'pending');
    if (sponsorFilterStatus === 'has_unsent_emails') return genInv.some(i => i.status === 'pending' && isValidEmailAddress(i.email) && !i.emailSentAt);

    return true;
  })();

  // Métricas Globales
  const totalInvitesCount = invites.length;
  const totalPendingCount = invites.filter(i => i.status === 'pending').length;
  const totalUsedCount = invites.filter(i => i.status === 'used').length;

  // Métricas Detalladas del Medidor de Correos
  const totalWithValidEmail = invites.filter(i => isValidEmailAddress(i.email)).length;
  const totalEmailsSent = invites.filter(i => i.emailSent || i.emailSentAt).length;
  const totalEmailsPending = invites.filter(i => isValidEmailAddress(i.email) && !i.emailSentAt && i.status === 'pending').length;
  const totalUnregisteredWithEmail = invites.filter(i => isValidEmailAddress(i.email) && i.status === 'pending').length;
  const totalRegisteredFromEmail = invites.filter(i => (i.emailSent || i.emailSentAt) && i.status === 'used').length;
  const totalWithoutValidEmail = totalInvitesCount - totalWithValidEmail;
  
  const emailCoveragePercent = totalWithValidEmail > 0 ? Math.round((totalEmailsSent / totalWithValidEmail) * 100) : 0;
  const emailConversionPercent = totalEmailsSent > 0 ? Math.round((totalRegisteredFromEmail / (totalEmailsSent || 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Hidden inputs para carga de archivos */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(e, selectedSponsorFilter)}
          accept=".xlsx, .xls, .csv"
          className="hidden"
        />

        <input
          type="file"
          ref={singleSponsorFileInputRef}
          onChange={(e) => handleFileUpload(e, targetedUploadSponsor)}
          accept=".xlsx, .xls, .csv"
          className="hidden"
        />

        {/* Header Principal con Selector de Modo de Vista & Exportar Informe */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-outline-variant shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck size={14} />
              Acceso Exclusivo de Un Solo Uso
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-on-surface">
              Directorio de Patrocinadores & Invitaciones
            </h1>
            <p className="text-secondary text-sm">
              Gestiona listas de invitados por marca, sube archivos Excel independientes y configura los artes co-brandeados.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Botón Descargar Informe Ejecutivo Excel */}
            <button
              onClick={handleExportExecutiveReport}
              disabled={invites.length === 0}
              className="px-4 py-2.5 bg-[#217346] hover:bg-[#1a5c37] text-white rounded-xl font-bold transition-all flex items-center gap-2 text-xs shadow-sm cursor-pointer disabled:opacity-40"
              title="Descargar reporte ejecutivo consolidado en Excel con resumen por patrocinador y detalle completo"
            >
              <FileSpreadsheet size={16} />
              <span>Informe Ejecutivo (Excel)</span>
            </button>

            {/* Toggle de Vistas */}
            <div className="bg-surface-variant/40 p-1 rounded-xl border border-outline-variant flex items-center gap-1">
              <button
                onClick={() => {
                  setViewMode('sponsors');
                  setSelectedSponsorFilter('all');
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'sponsors'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                <Building2 size={15} />
                Directorio Patrocinadores ({sponsorsList.length + 1})
              </button>

              <button
                onClick={() => setViewMode('invites')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'invites'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                <Users size={15} />
                Detalle Invitados ({totalInvitesCount})
              </button>
            </div>

            <button
              onClick={() => {
                setGuestSponsor(selectedSponsorFilter !== 'all' ? selectedSponsorFilter : 'general');
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 text-xs shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              Nuevo Invitado
            </button>

            <button
              onClick={onBack}
              className="px-4 py-2.5 bg-white border border-outline-variant text-on-surface rounded-xl font-bold hover:bg-surface-variant transition-all flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <ArrowLeft size={16} />
              Volver al Hub
            </button>
          </div>
        </div>

        {/* 📊 MEDIDOR VISUAL & MONITOR DE DESPACHO DE CORREOS */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-slate-700/50 space-y-5 relative overflow-hidden">
          
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0 shadow-inner">
                <MailCheck size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-black text-white tracking-wide">
                    Medidor de Despacho & Seguimiento de Correos
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    En Vivo
                  </span>
                </div>
                <p className="text-slate-300 text-xs">
                  {totalEmailsSent} de {totalWithValidEmail} invitados con correo han recibido su invitación oficial co-brandeada ({emailCoveragePercent}% de cobertura).
                </p>
              </div>
            </div>

            {/* Botones de Despacho Global & Recordatorio */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => handleOpenBulkEmailModal('all', 'never_sent')}
                disabled={totalEmailsPending === 0}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-95"
                title={totalEmailsPending === 0 ? "No hay invitaciones iniciales pendientes por enviar" : "Enviar invitación inicial a los que nunca han recibido correo"}
              >
                <SendHorizontal size={15} className="text-slate-950" />
                <span>Despachar Nuevos ({totalEmailsPending})</span>
              </button>

              <button
                onClick={() => handleOpenBulkEmailModal('all', 'unregistered_reminder')}
                disabled={totalUnregisteredWithEmail === 0}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-95 border border-white/10"
                title="Enviar correo de recordatorio a todos los contactos que aún no han completado su pase"
              >
                <Bell size={15} className="text-amber-300" />
                <span>🔔 Recordatorio Masivo ({totalUnregisteredWithEmail})</span>
              </button>
            </div>
          </div>

          {/* Barra Medidora / Termómetro de Cobertura */}
          <div className="space-y-2 relative z-10 bg-black/30 p-4 rounded-2xl border border-white/10">
            <div className="flex justify-between items-end text-xs">
              <div className="flex items-center gap-4">
                <span className="font-black text-2xl text-white">{emailCoveragePercent}%</span>
                <span className="text-slate-300 text-xs font-medium">Progreso Global de Envíos</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  Enviados: {totalEmailsSent}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  Pendientes: {totalEmailsPending}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  Sin Correo: {totalWithoutValidEmail}
                </span>
              </div>
            </div>

            {/* Barra Segmentada */}
            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all duration-500"
                style={{ width: `${totalInvitesCount > 0 ? (totalEmailsSent / totalInvitesCount) * 100 : 0}%` }}
                title={`Enviados: ${totalEmailsSent}`}
              />
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-500"
                style={{ width: `${totalInvitesCount > 0 ? (totalEmailsPending / totalInvitesCount) * 100 : 0}%` }}
                title={`Pendientes con correo: ${totalEmailsPending}`}
              />
              <div
                className="bg-slate-600 h-full transition-all duration-500"
                style={{ width: `${totalInvitesCount > 0 ? (totalWithoutValidEmail / totalInvitesCount) * 100 : 0}%` }}
                title={`Sin correo o inválido: ${totalWithoutValidEmail}`}
              />
            </div>
          </div>

          {/* 4 Píldoras Métricas Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 text-xs">
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <Check size={16} />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Correos Enviados</span>
                <span className="text-base font-black text-white">{totalEmailsSent}</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Clock size={16} />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Listos p/ Enviar</span>
                <span className="text-base font-black text-white">{totalEmailsPending}</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Gafetes Emitidos</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-black text-white">{totalRegisteredFromEmail}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">({emailConversionPercent}% tasa)</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-500/20 text-slate-300 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Sin Correo Válido</span>
                <span className="text-base font-black text-white">{totalWithoutValidEmail}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Tarjetas de Métricas Globales Secundarias */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">Total Enlaces / Invitados</p>
              <p className="text-2xl font-black text-on-surface">{totalInvitesCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">Pendientes de Registro</p>
              <p className="text-2xl font-black text-amber-600">{totalPendingCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">Registrados (Gafetes Emitidos)</p>
              <p className="text-2xl font-black text-green-600">{totalUsedCount}</p>
            </div>
          </div>
        </div>

        {/* VISTA 1: DIRECTORIO DE PATROCINADORES EN FORMATO LISTA / TABLA */}
        {viewMode === 'sponsors' && (
          <div className="space-y-4">
            
            {/* Barra de Filtros y Búsqueda de Patrocinador */}
            <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs space-y-4">
              
              {/* Fila Superior: Búsqueda + Botón de Informe Ejecutivo */}
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-96">
                  <Search size={18} className="absolute left-3.5 top-3 text-secondary" />
                  <input
                    type="text"
                    placeholder="Buscar patrocinador o stand..."
                    value={sponsorSearchTerm}
                    onChange={(e) => setSponsorSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                  />
                  {sponsorSearchTerm && (
                    <button 
                      onClick={() => setSponsorSearchTerm('')}
                      className="absolute right-3 top-2.5 text-secondary hover:text-on-surface text-xs font-bold"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
                  <button
                    onClick={handleExportExecutiveReport}
                    disabled={invites.length === 0}
                    className="px-4 py-2 bg-[#217346] hover:bg-[#1a5c37] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    title="Descargar reporte ejecutivo en Excel con desglose por patrocinador y lista global"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Descargar Informe Ejecutivo (Excel)</span>
                  </button>

                  <div className="text-xs text-secondary font-medium pl-2 border-l border-outline-variant hidden sm:block">
                    Mostrando <strong>{filteredSponsorsList.length + (showGeneralRow ? 1 : 0)}</strong> de {sponsorsList.length + 1}
                  </div>
                </div>
              </div>

              {/* Fila Inferior: Chips de Filtro Rápido */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-outline-variant/60 text-xs">
                <span className="text-secondary font-bold text-[11px] uppercase tracking-wider mr-1 flex items-center gap-1">
                  <ListFilter size={13} />
                  Filtrar por:
                </span>

                <button
                  onClick={() => setSponsorFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    sponsorFilterStatus === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-surface-variant/40 hover:bg-surface-variant text-secondary border border-outline-variant/60'
                  }`}
                >
                  Todos ({sponsorsList.length + 1})
                </button>

                <button
                  onClick={() => setSponsorFilterStatus('has_registered')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sponsorFilterStatus === 'has_registered'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 size={13} />
                  Con Registrados ({countSponsorsWithRegistered})
                </button>

                <button
                  onClick={() => setSponsorFilterStatus('has_pending')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sponsorFilterStatus === 'has_pending'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  <Clock size={13} />
                  Con Pendientes ({countSponsorsWithPending})
                </button>

                <button
                  onClick={() => setSponsorFilterStatus('has_unsent_emails')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sponsorFilterStatus === 'has_unsent_emails'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  <Mail size={13} />
                  Con Envíos Pendientes ({countSponsorsWithUnsentEmails})
                </button>

                <button
                  onClick={() => setSponsorFilterStatus('has_invites')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    sponsorFilterStatus === 'has_invites'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  <Users size={13} />
                  Con Invitados Cargados ({countSponsorsWithInvites})
                </button>

                {sponsorFilterStatus !== 'all' && (
                  <button
                    onClick={() => setSponsorFilterStatus('all')}
                    className="ml-auto text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer underline"
                  >
                    Restablecer Filtros
                  </button>
                )}
              </div>

            </div>

            {/* TABLA PRINCIPAL DE PATROCINADORES */}
            <div className="bg-white rounded-2xl border border-outline-variant shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-variant/40 border-b border-outline-variant text-xs uppercase tracking-wider text-secondary">
                      <th className="p-4 font-bold">Patrocinador / Marca</th>
                      <th className="p-4 font-bold">Stand(s)</th>
                      <th className="p-4 font-bold text-center">Envíos de Correo</th>
                      <th className="p-4 font-bold text-center">Registrados vs Pendientes</th>
                      <th className="p-4 font-bold text-center">Artes & Speech</th>
                      <th className="p-4 font-bold text-center">Carga & Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    
                    {/* FILA ESPECIAL: INVITACIÓN GENERAL */}
                    {showGeneralRow && (
                      <tr className="bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                              ⭐
                            </div>
                            <div>
                              <div className="font-bold text-on-surface text-base flex items-center gap-1.5">
                                <span>Invitación General</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary text-on-primary font-bold">Oficial</span>
                              </div>
                              <p className="text-xs text-secondary">Comité Organizador EXPO FERRE 2026 (Karen Torres)</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="text-xs text-slate-500 font-medium">Evento General</span>
                        </td>

                        {/* Métrica: Envíos de Correo */}
                        <td className="p-4 text-center">
                          {(() => {
                            const genInv = invites.filter(i => !i.sponsorName || i.sponsorId === 'general' || getSponsorKey(i.sponsorName) === 'general');
                            const genWithEmail = genInv.filter(i => isValidEmailAddress(i.email)).length;
                            const genEmailSent = genInv.filter(i => i.emailSent || i.emailSentAt).length;
                            const genUnsent = genInv.filter(i => isValidEmailAddress(i.email) && !i.emailSentAt && i.status === 'pending').length;
                            const genCoverage = genWithEmail > 0 ? Math.round((genEmailSent / genWithEmail) * 100) : 0;

                            return (
                              <div className="space-y-1.5 min-w-[130px] max-w-[160px] mx-auto">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-700 flex items-center gap-1">
                                    <Mail size={12} className="text-amber-600" />
                                    {genEmailSent}/{genWithEmail}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                    genCoverage === 100 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : genCoverage > 0 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {genCoverage}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                                  <div 
                                    className="bg-emerald-500 h-full transition-all duration-300" 
                                    style={{ width: `${genCoverage}%` }} 
                                  />
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {genUnsent > 0 ? (
                                    <span className="text-amber-700 font-bold">⏳ {genUnsent} pendientes de envío</span>
                                  ) : genWithEmail > 0 ? (
                                    <span className="text-emerald-700 font-bold">✓ 100% Despachado</span>
                                  ) : (
                                    <span className="text-slate-400">Sin correos</span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Métrica: Registrados vs Pendientes */}
                        <td className="p-4 text-center">
                          {(() => {
                            const genInv = invites.filter(i => !i.sponsorName || i.sponsorId === 'general' || getSponsorKey(i.sponsorName) === 'general');
                            const genUsed = genInv.filter(i => i.status === 'used').length;
                            const genPending = genInv.length - genUsed;
                            const genEffectiveRate = genInv.length > 0 ? Math.round((genUsed / genInv.length) * 100) : 0;

                            return (
                              <div className="space-y-1 min-w-[120px] max-w-[150px] mx-auto">
                                <div className="text-sm font-black text-on-surface">
                                  {genInv.length} <span className="text-[10px] font-normal text-slate-500">invitados</span>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-xs font-bold">
                                  <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200" title="Gafetes Emitidos">
                                    ✓ {genUsed}
                                  </span>
                                  <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Pendientes de Registro">
                                    ⏳ {genPending}
                                  </span>
                                </div>
                                {genInv.length > 0 && (
                                  <div className="text-[10px] text-slate-500">
                                    <span className="font-bold text-slate-700">{genEffectiveRate}%</span> efectividad
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Artes (Correo & WhatsApp) */}
                        <td className="p-4 text-center">
                          {(() => {
                            const genArt = getSponsorArt('general');
                            return (
                              <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-[150px] mx-auto">
                                <div className="w-10 h-6 bg-slate-800 rounded border border-slate-300 overflow-hidden shrink-0 relative flex items-center justify-center" title="Banner Correo General (Header)">
                                  <img 
                                    src={genArt.headerBannerUrl || '/email-header.png'} 
                                    alt="Header" 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = '/email-header.png';
                                    }}
                                  />
                                  {genArt.hasCustomHeader && (
                                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" title="Header personalizado"></span>
                                  )}
                                </div>
                                {genArt.whatsappBannerUrl ? (
                                  <div className="w-5 h-7 bg-emerald-950 rounded border border-emerald-400 overflow-hidden shrink-0 relative flex items-center justify-center shadow-xs" title="Flyer Vertical WhatsApp (Asignado)">
                                    <img 
                                      src={genArt.whatsappBannerUrl} 
                                      alt="WhatsApp" 
                                      className="w-full h-full object-cover" 
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                  </div>
                                ) : (
                                  <div className="w-5 h-7 bg-slate-100 rounded border border-dashed border-slate-300 shrink-0 flex items-center justify-center text-slate-400" title="Sin flyer vertical de WhatsApp">
                                    <Phone size={10} />
                                  </div>
                                )}
                                <button
                                  onClick={() => handleOpenArtModal('general')}
                                  className={`p-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                                    genArt.hasCustomHeader || genArt.hasCustomWhatsapp
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                      : 'bg-white border border-outline-variant hover:bg-surface text-secondary'
                                  }`}
                                  title="Configurar artes de Correo y WhatsApp General"
                                >
                                  <Palette size={13} />
                                </button>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Acciones */}
                        <td className="p-4 text-center">
                          {(() => {
                            const genInv = invites.filter(i => !i.sponsorName || i.sponsorId === 'general' || getSponsorKey(i.sponsorName) === 'general');
                            const genPendingWithEmail = genInv.filter(i => i.status === 'pending' && isValidEmailAddress(i.email));
                            const genUnsentEmail = genPendingWithEmail.filter(i => !i.emailSentAt);
                            const countToSend = genUnsentEmail.length > 0 ? genUnsentEmail.length : genPendingWithEmail.length;

                            const genPendingWithPhone = genInv.filter(i => i.status === 'pending' && cleanPhoneNumber(i.telefono).isValid);
                            const genUnsentPhone = genPendingWithPhone.filter(i => !i.whatsappSent && !i.whatsappSentAt);
                            const countGenWaToSend = genUnsentPhone.length > 0 ? genUnsentPhone.length : genPendingWithPhone.length;

                            return (
                              <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap bg-surface-variant/30 p-1.5 rounded-xl border border-outline-variant/60">
                                {/* Botón Cargar Excel */}
                                <button
                                  onClick={() => handleTriggerUploadForSponsor('general')}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                  title="Cargar archivo Excel para la lista General"
                                >
                                  <FileUp size={13} />
                                  <span>Cargar Excel</span>
                                </button>

                                {/* Botón Enviar Correos Masivos */}
                                <button
                                  onClick={() => handleOpenBulkEmailModal('general')}
                                  disabled={genPendingWithEmail.length === 0}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                                    genUnsentEmail.length > 0
                                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                      : genPendingWithEmail.length > 0
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                  title={
                                    genPendingWithEmail.length === 0
                                      ? 'No hay correos pendientes en la lista general'
                                      : `Enviar invitaciones por correo (${countToSend} destinatarios disponibles)`
                                  }
                                >
                                  <MailCheck size={13} />
                                  <span>Enviar Correos</span>
                                  {genPendingWithEmail.length > 0 && (
                                    <span className="ml-0.5 px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                                      {countToSend}
                                    </span>
                                  )}
                                </button>

                                {/* Botón Enviar WhatsApp Wati Masivo */}
                                <button
                                  onClick={() => handleOpenBulkWatiModal('general')}
                                  disabled={genPendingWithPhone.length === 0}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                                    genUnsentPhone.length > 0
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : genPendingWithPhone.length > 0
                                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                  title={
                                    genPendingWithPhone.length === 0
                                      ? 'No hay teléfonos válidos pendientes en la lista general'
                                      : `Enviar invitaciones masivas por WhatsApp (WATI) (${countGenWaToSend} disponibles)`
                                  }
                                >
                                  <Zap size={13} />
                                  <span>WhatsApp Wati</span>
                                  {genPendingWithPhone.length > 0 && (
                                    <span className="ml-0.5 px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                                      {countGenWaToSend}
                                    </span>
                                  )}
                                </button>

                                {/* Botón Ver Invitados */}
                                <button
                                  onClick={() => {
                                    setSelectedSponsorFilter('general');
                                    setViewMode('invites');
                                  }}
                                  className="px-2.5 py-1.5 bg-white border border-outline-variant hover:bg-surface text-on-surface rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title={`Ver los ${genInv.length} invitados de la lista General`}
                                >
                                  <Users size={13} />
                                  <span>Ver ({genInv.length})</span>
                                </button>

                                {/* Plantilla */}
                                <button
                                  onClick={() => handleDownloadTemplateForSponsor('general')}
                                  className="p-1.5 bg-white border border-outline-variant hover:bg-surface text-secondary rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                                  title="Descargar plantilla Excel para la lista General"
                                >
                                  <Download size={13} />
                                </button>

                                {/* Exportar */}
                                <button
                                  onClick={() => handleExportExcel('general')}
                                  disabled={genInv.length === 0}
                                  className="p-1.5 bg-[#217346] hover:bg-[#1a5c37] text-white rounded-lg text-xs transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                                  title="Exportar a Excel los invitados de la lista General"
                                >
                                  <FileSpreadsheet size={13} />
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    )}

                    {/* FILAS DE LOS 27 PATROCINADORES */}
                    {filteredSponsorsList.map((sp) => {
                      const spInvites = invites.filter(i => isMatchingSponsor(i.sponsorName, sp) || (i.sponsorId && i.sponsorId === getSponsorKey(sp)));
                      const spUsed = spInvites.filter(i => i.status === 'used').length;
                      const spPending = spInvites.length - spUsed;
                      const spWithEmail = spInvites.filter(i => isValidEmailAddress(i.email)).length;
                      const spEmailSent = spInvites.filter(i => i.emailSent || i.emailSentAt).length;
                      const spPendingWithEmail = spInvites.filter(i => i.status === 'pending' && isValidEmailAddress(i.email));
                      const spUnsentEmail = spPendingWithEmail.filter(i => !i.emailSentAt);
                      const countToSend = spUnsentEmail.length > 0 ? spUnsentEmail.length : spPendingWithEmail.length;
                      
                      const spPendingWithPhone = spInvites.filter(i => i.status === 'pending' && cleanPhoneNumber(i.telefono).isValid);
                      const spUnsentPhone = spPendingWithPhone.filter(i => !i.whatsappSent && !i.whatsappSentAt);
                      const countWaToSend = spUnsentPhone.length > 0 ? spUnsentPhone.length : spPendingWithPhone.length;
                      
                      const spCoverage = spWithEmail > 0 ? Math.round((spEmailSent / spWithEmail) * 100) : 0;
                      const spEffectiveRate = spInvites.length > 0 ? Math.round((spUsed / spInvites.length) * 100) : 0;

                      const art = getSponsorArt(sp);
                      const rawStands = sponsorsMap[sp]?.stands?.join(', ') || art.stands || 'N/A';
                      const cleanStands = rawStands.replace(/stand\s*/gi, '').trim();
                      const standsText = cleanStands.includes(',') || cleanStands.includes('-') ? `Stands ${cleanStands}` : `Stand ${cleanStands}`;

                      return (
                        <tr key={sp} className="hover:bg-surface-variant/20 transition-colors">
                          
                          {/* Patrocinador */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shrink-0">
                                🏢
                              </div>
                              <div>
                                <div className="font-bold text-on-surface text-base">
                                  {sp}
                                </div>
                                <p className="text-xs text-secondary">
                                  {sponsorsMap[sp]?.contactName ? `Contacto: ${sponsorsMap[sp].contactName}` : 'Patrocinador Oficial'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Stands */}
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 font-bold text-xs rounded-full border border-amber-200">
                              📍 {standsText}
                            </span>
                          </td>

                          {/* Métrica: Envíos de Correo */}
                          <td className="p-4 text-center">
                            <div className="space-y-1.5 min-w-[130px] max-w-[160px] mx-auto">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-700 flex items-center gap-1">
                                  <Mail size={12} className="text-amber-600" />
                                  {spEmailSent}/{spWithEmail}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                  spCoverage === 100 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : spCoverage > 0 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {spCoverage}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                                <div 
                                  className="bg-emerald-500 h-full transition-all duration-300" 
                                  style={{ width: `${spCoverage}%` }} 
                                />
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {spUnsentEmail.length > 0 ? (
                                  <span className="text-amber-700 font-bold">⏳ {spUnsentEmail.length} pendientes de envío</span>
                                ) : spWithEmail > 0 ? (
                                  <span className="text-emerald-700 font-bold">✓ 100% Despachado</span>
                                ) : (
                                  <span className="text-slate-400">Sin correos</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Métrica: Registrados vs Pendientes */}
                          <td className="p-4 text-center">
                            <div className="space-y-1 min-w-[120px] max-w-[150px] mx-auto">
                              <div className="text-sm font-black text-on-surface">
                                {spInvites.length} <span className="text-[10px] font-normal text-slate-500">invitados</span>
                              </div>
                              <div className="flex items-center justify-center gap-2 text-xs font-bold">
                                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200" title="Gafetes Emitidos">
                                  ✓ {spUsed}
                                </span>
                                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Pendientes de Registro">
                                  ⏳ {spPending}
                                </span>
                              </div>
                              {spInvites.length > 0 && (
                                <div className="text-[10px] text-slate-500">
                                  <span className="font-bold text-slate-700">{spEffectiveRate}%</span> efectividad
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Artes (Correo & WhatsApp) */}
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-[150px] mx-auto">
                              {/* Miniatura Header Correo */}
                              <div className="w-10 h-6 bg-slate-800 rounded border border-slate-300 overflow-hidden shrink-0 relative flex items-center justify-center" title="Banner Correo (Header)">
                                <img 
                                  src={art.headerBannerUrl || '/email-header.png'} 
                                  alt="Header" 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/email-header.png';
                                  }}
                                />
                                {art.hasCustomHeader && (
                                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" title="Header personalizado"></span>
                                )}
                              </div>

                              {/* Miniatura WhatsApp Vertical */}
                              {art.whatsappBannerUrl ? (
                                <div className="w-5 h-7 bg-emerald-950 rounded border border-emerald-400 overflow-hidden shrink-0 relative flex items-center justify-center shadow-xs" title="Flyer Vertical WhatsApp (Asignado)">
                                  <img 
                                    src={art.whatsappBannerUrl} 
                                    alt="WhatsApp" 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                </div>
                              ) : (
                                <div className="w-5 h-7 bg-slate-100 rounded border border-dashed border-slate-300 shrink-0 flex items-center justify-center text-slate-400" title="Sin flyer vertical de WhatsApp">
                                  <Phone size={10} />
                                </div>
                              )}

                              <button
                                onClick={() => handleOpenArtModal(sp)}
                                className={`p-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                                  art.hasCustomHeader || art.hasCustomWhatsapp
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                    : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                                }`}
                                title="Configurar artes de Correo y WhatsApp para este patrocinador"
                              >
                                <Palette size={13} />
                              </button>
                            </div>
                          </td>

                          {/* Acciones de Carga y Gestión */}
                          <td className="p-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap bg-surface-variant/30 p-1.5 rounded-xl border border-outline-variant/60">
                              
                              {/* Botón Cargar Excel */}
                              <button
                                onClick={() => handleTriggerUploadForSponsor(sp)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                title={`Cargar archivo Excel de invitados para ${sp}`}
                              >
                                <FileUp size={13} />
                                <span>Cargar Excel</span>
                              </button>

                              {/* Botón Enviar Correos Masivos */}
                              <button
                                onClick={() => handleOpenBulkEmailModal(sp)}
                                disabled={spPendingWithEmail.length === 0}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                                  spUnsentEmail.length > 0
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : spPendingWithEmail.length > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                                title={
                                  spPendingWithEmail.length === 0
                                    ? `No hay correos pendientes registrados para ${sp}`
                                    : `Enviar invitaciones por correo para ${sp} (${countToSend} destinatarios disponibles)`
                                }
                              >
                                <MailCheck size={13} />
                                <span>Enviar Correos</span>
                                {spPendingWithEmail.length > 0 && (
                                  <span className="ml-0.5 px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                                    {countToSend}
                                  </span>
                                )}
                              </button>

                              {/* Botón Enviar WhatsApp Wati Masivo */}
                              <button
                                onClick={() => handleOpenBulkWatiModal(sp)}
                                disabled={spPendingWithPhone.length === 0}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                                  spUnsentPhone.length > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : spPendingWithPhone.length > 0
                                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}
                                title={
                                  spPendingWithPhone.length === 0
                                    ? `No hay teléfonos válidos pendientes para ${sp}`
                                    : `Enviar invitaciones masivas por WhatsApp (WATI) para ${sp} (${countWaToSend} disponibles)`
                                }
                              >
                                <Zap size={13} />
                                <span>WhatsApp Wati</span>
                                {spPendingWithPhone.length > 0 && (
                                  <span className="ml-0.5 px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                                    {countWaToSend}
                                  </span>
                                )}
                              </button>

                              {/* Botón Ver Lista de Invitados */}
                              <button
                                onClick={() => {
                                  setSelectedSponsorFilter(sp);
                                  setViewMode('invites');
                                }}
                                className="px-2.5 py-1.5 bg-white border border-outline-variant hover:bg-surface text-on-surface rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                title={`Ver los ${spInvites.length} invitados de ${sp}`}
                              >
                                <Users size={13} />
                                <span>Ver ({spInvites.length})</span>
                              </button>

                              {/* Plantilla */}
                              <button
                                onClick={() => handleDownloadTemplateForSponsor(sp)}
                                className="p-1.5 bg-white border border-outline-variant hover:bg-surface text-secondary rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                                title={`Descargar plantilla Excel para ${sp}`}
                              >
                                <Download size={13} />
                              </button>

                              {/* Exportar */}
                              <button
                                onClick={() => handleExportExcel(sp)}
                                disabled={spInvites.length === 0}
                                className="p-1.5 bg-[#217346] hover:bg-[#1a5c37] text-white rounded-lg text-xs transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                                title={`Exportar a Excel los invitados de ${sp}`}
                              >
                                <FileSpreadsheet size={13} />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}

                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* VISTA 2: TABLA DETALLADA DE INVITADOS CON ENVÍOS */}
        {viewMode === 'invites' && (
          <div className="space-y-4">
            
            {/* Barra superior de la lista con botón para volver */}
            <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setViewMode('sponsors');
                    setSelectedSponsorFilter('all');
                  }}
                  className="px-3 py-2 bg-surface hover:bg-surface-variant text-on-surface rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-outline-variant"
                >
                  <ArrowLeft size={14} />
                  Volver a Directorio
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary font-bold uppercase">Viendo Lista:</span>
                  <span className="px-3 py-1 bg-primary text-on-primary font-bold text-xs rounded-full shadow-xs">
                    {selectedSponsorFilter === 'all' ? '🌐 Todas las Listas' : (selectedSponsorFilter === 'general' ? '⭐ Invitación General' : `🏢 ${selectedSponsorFilter}`)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Botón Enviar Correos Masivos */}
                {(() => {
                  const pendingWithEmail = filteredInvites.filter(i => i.status === 'pending' && i.email && i.email.includes('@'));
                  const unsentEmail = pendingWithEmail.filter(i => !i.emailSentAt);
                  const count = unsentEmail.length > 0 ? unsentEmail.length : pendingWithEmail.length;

                  return (
                    <button
                      onClick={() => handleOpenBulkEmailModal(selectedSponsorFilter === 'all' ? 'all' : selectedSponsorFilter)}
                      disabled={pendingWithEmail.length === 0}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      title={
                        pendingWithEmail.length === 0
                          ? 'No hay correos pendientes en la vista actual'
                          : `Enviar correos a los invitados de esta vista (${count} disponibles)`
                      }
                    >
                      <MailCheck size={14} />
                      Enviar Correos Masivos ({count})
                    </button>
                  );
                })()}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileUp size={14} />
                  Cargar Excel a esta lista
                </button>

                <button
                  onClick={() => handleExportExcel(selectedSponsorFilter)}
                  disabled={filteredInvites.length === 0}
                  className="px-3.5 py-2 bg-[#217346] text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet size={14} />
                  Exportar Excel
                </button>
              </div>

            </div>

            {/* Barra de Búsqueda y Filtros de Estado */}
            <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search size={18} className="absolute left-3.5 top-3 text-secondary" />
                <input
                  type="text"
                  placeholder="Buscar invitado, empresa o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'all' ? 'bg-primary text-on-primary' : 'bg-surface text-secondary hover:bg-surface-variant'
                  }`}
                >
                  Todos ({filteredInvites.length})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-surface text-secondary hover:bg-surface-variant'
                  }`}
                >
                  Pendientes ({filteredInvites.filter(i => i.status === 'pending').length})
                </button>
                <button
                  onClick={() => setStatusFilter('used')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    statusFilter === 'used' ? 'bg-green-600 text-white' : 'bg-surface text-secondary hover:bg-surface-variant'
                  }`}
                >
                  Registrados ({filteredInvites.filter(i => i.status === 'used').length})
                </button>
              </div>
            </div>

            {/* TABLA DE INVITACIONES */}
            <div className="bg-white rounded-2xl border border-outline-variant shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-variant/40 border-b border-outline-variant text-xs uppercase tracking-wider text-secondary">
                      <th className="p-4 font-bold">Invitado / Destinatario</th>
                      <th className="p-4 font-bold">Patrocinador / Stand</th>
                      <th className="p-4 font-bold">Estado Enlace & Correo</th>
                      <th className="p-4 font-bold">Resultado de Registro</th>
                      <th className="p-4 font-bold text-center">Acciones & Envíos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-secondary">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            Cargando lista de invitados...
                          </div>
                        </td>
                      </tr>
                    ) : filteredInvites.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-secondary">
                          {searchTerm ? 'No se encontraron contactos con ese término de búsqueda.' : 'No hay invitados en esta lista aún. Puedes presionar "Cargar Excel" para importar los contactos.'}
                        </td>
                      </tr>
                    ) : (
                      filteredInvites.map((inv) => {
                        const isUsed = inv.status === 'used';
                        const isWaCopied = copiedToken === `wa_${inv.id}`;
                        const isWaRemCopied = copiedToken === `wa_rem_${inv.id}`;
                        const isLinkCopied = copiedToken === `link_${inv.id}`;

                        return (
                          <tr key={inv.id} className="hover:bg-surface-variant/20 transition-colors">
                            
                            {/* Invitado / Destinatario */}
                            <td className="p-4">
                              <div className="font-bold text-on-surface">
                                {inv.nombre || <span className="text-secondary italic">Sin nombre previo</span>}
                              </div>
                              {inv.empresa && (
                                <div className="text-xs text-secondary flex items-center gap-1 mt-0.5 font-medium">
                                  <Building2 size={12} /> {inv.empresa}
                                </div>
                              )}
                              <div className="text-xs text-slate-500 font-mono mt-0.5 flex flex-wrap gap-2">
                                {inv.email && <span>✉️ {inv.email}</span>}
                                {inv.telefono && <span>📞 {inv.telefono}</span>}
                              </div>
                            </td>

                            {/* Lista / Patrocinador */}
                            <td className="p-4">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                🏢 {inv.sponsorName || 'Invitación General'}
                              </div>
                              {inv.sponsorStands && (
                                <div className="text-[11px] text-amber-700 font-medium mt-1">
                                  Stand: {inv.sponsorStands}
                                </div>
                              )}
                            </td>

                            {/* Estado del Enlace & Correo */}
                            <td className="p-4 space-y-1">
                              <div>
                                {isUsed ? (
                                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-green-200">
                                    <CheckCircle2 size={11} /> USADO / REGISTRADO
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-amber-200">
                                    <Clock size={11} /> PENDIENTE REGISTRO
                                  </span>
                                )}
                              </div>

                              <div>
                                {inv.emailSentAt ? (
                                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-medium px-2.5 py-0.5 rounded-full text-[10px] border border-blue-200" title={`Enviado a ${inv.lastEmailTo || inv.email}`}>
                                    <MailCheck size={10} /> Correo Enviado ({inv.emailSendCount || 1})
                                  </span>
                                ) : inv.email ? (
                                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-medium px-2.5 py-0.5 rounded-full text-[10px] border border-slate-200">
                                    <Clock size={10} /> Correo No Enviado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 font-medium px-2.5 py-0.5 rounded-full text-[10px] border border-red-200">
                                    <AlertCircle size={10} /> Sin Correo
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Resultado */}
                            <td className="p-4">
                              {isUsed ? (
                                <div className="text-xs">
                                  <div className="font-bold text-green-800">{inv.registeredName}</div>
                                  <div className="text-secondary">{inv.registeredCompany}</div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {inv.usedAt?.toLocaleDateString ? inv.usedAt.toLocaleDateString() : 'Registrado'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Esperando que el invitado llene el formulario</span>
                              )}
                            </td>

                            {/* Acciones */}
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                
                                {/* Ver Código QR (Invitación o Pase de Acceso) */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPersonForQR({
                                      id: isUsed ? (inv.registeredAttendeeId || inv.id) : inv.id,
                                      nombre: inv.registeredName || inv.nombre,
                                      empresa: inv.registeredCompany || inv.empresa,
                                      email: inv.registeredEmail || inv.email,
                                      telefono: inv.registeredPhone || inv.telefono,
                                      sponsorName: inv.sponsorName,
                                      sponsorStands: inv.sponsorStands,
                                      status: inv.status,
                                      inviteUrl: getInviteUrl(inv.id)
                                    });
                                    setQrModalOpen(true);
                                  }}
                                  title={isUsed ? "Visualizar y Descargar Código QR de Acceso Oficial" : "Visualizar Código QR para escanear y abrir la invitación"}
                                  className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shadow-2xs cursor-pointer ${
                                    isUsed 
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  }`}
                                >
                                  <QrCode size={14} />
                                  <span className="hidden xl:inline">QR</span>
                                </button>

                                {/* Editar Invitado */}
                                <button
                                  onClick={() => handleOpenEditGuest(inv)}
                                  title="Editar datos del invitado o cambiar lista"
                                  className="p-2 bg-white border border-outline-variant hover:bg-surface text-secondary hover:text-primary rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 size={14} />
                                </button>

                                {/* WhatsApp WATI Oficial (1-Click) */}
                                <button
                                  type="button"
                                  disabled={!inv.telefono || isSendingWatiId === inv.id}
                                  onClick={() => handleSendSingleWati(inv)}
                                  title={
                                    !inv.telefono
                                      ? "Sin teléfono registrado"
                                      : inv.whatsappSent
                                      ? `Reenviar por WATI API (Enviado previamente: ${inv.whatsappSendCount || 1} veces)`
                                      : "Disparar invitación oficial por WATI (WhatsApp API)"
                                  }
                                  className={`p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-bold shadow-2xs cursor-pointer disabled:opacity-40 ${
                                    inv.whatsappSent
                                      ? 'bg-teal-700 hover:bg-teal-800 text-white'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                >
                                  {isSendingWatiId === inv.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Zap size={14} />
                                  )}
                                  <span className="hidden xl:inline">Wati</span>
                                  {inv.whatsappSent && (
                                    <span className="text-[10px] bg-black/20 px-1 rounded-full">✓</span>
                                  )}
                                </button>

                                {/* WhatsApp Directo (Invitación Oficial con Arte de Patrocinador) */}
                                <button
                                  type="button"
                                  onClick={() => setWhatsAppModal({ open: true, invite: inv, isReminder: false })}
                                  title="Ver arte personalizado y abrir WhatsApp con Invitación Oficial"
                                  className="p-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shadow-2xs cursor-pointer"
                                >
                                  <Phone size={14} />
                                  <span className="hidden xl:inline">WhatsApp</span>
                                </button>

                                {/* Recordatorio WhatsApp (Para Pendientes de Registro) */}
                                {inv.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => setWhatsAppModal({ open: true, invite: inv, isReminder: true })}
                                    title="Ver arte de recordatorio y enviar mensaje por WhatsApp"
                                    className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shadow-2xs cursor-pointer"
                                  >
                                    <Bell size={14} />
                                    <span className="hidden xl:inline">Recordar</span>
                                  </button>
                                )}

                                {/* Copiar Speech WhatsApp */}
                                <button
                                  onClick={() => inv.status === 'pending' && inv.emailSentAt ? handleCopyWhatsAppReminder(inv) : handleCopyWhatsApp(inv)}
                                  title={inv.status === 'pending' && inv.emailSentAt ? "Copiar texto de Recordatorio de WhatsApp" : "Copiar texto de WhatsApp al portapapeles"}
                                  className={`p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                    isWaCopied || isWaRemCopied ? 'bg-green-600 text-white' : 'bg-surface hover:bg-surface-variant text-on-surface border border-outline-variant'
                                  }`}
                                >
                                  {isWaCopied || isWaRemCopied ? <Check size={14} /> : <Copy size={14} />}
                                </button>

                                {/* Enviar Correo */}
                                <button
                                  onClick={() => setEmailModal({ open: true, invite: { ...inv, targetEmail: inv.email || '' } })}
                                  title={inv.emailSentAt ? `Reenviar correo oficial (ya enviado ${inv.emailSendCount || 1} vez)` : "Enviar correo de invitación con banner y enlace"}
                                  className={`p-2 rounded-lg transition-colors cursor-pointer border ${
                                    inv.emailSentAt 
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300' 
                                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  <Mail size={14} />
                                </button>

                                {/* Copiar Link */}
                                <button
                                  onClick={() => handleCopyLinkOnly(inv)}
                                  title="Copiar enlace único de un solo uso"
                                  className={`p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                    isLinkCopied ? 'bg-green-600 text-white' : 'bg-surface hover:bg-surface-variant text-on-surface border border-outline-variant'
                                  }`}
                                >
                                  <ExternalLink size={14} />
                                </button>

                                {/* Eliminar */}
                                <button
                                  onClick={() => handleDeleteInvite(inv)}
                                  title="Eliminar invitación"
                                  className="p-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>

                              </div>
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL: Crear Nuevo Invitado */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-5 text-on-primary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus size={20} />
                <h3 className="font-bold text-base">Crear Invitación Directa</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-white/20 rounded-full text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Lista / Patrocinador Anfitrión
                </label>
                <select
                  value={guestSponsor}
                  onChange={(e) => setGuestSponsor(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary font-medium"
                >
                  <option value="general">⭐ Invitación General (ExpoFerre Oficial)</option>
                  {sponsorsList.map(sp => (
                    <option key={sp} value={sp}>🏢 {sp} {sponsorsMap[sp]?.stands ? `(Stand ${sponsorsMap[sp].stands.join(', ')})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Nombre del Invitado <span className="text-xs font-normal text-secondary">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Ing. Carlos Mendoza"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Empresa del Invitado <span className="text-xs font-normal text-secondary">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Ferretería El Roble"
                  value={guestCompany}
                  onChange={(e) => setGuestCompany(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Correo Electrónico <span className="text-xs font-normal text-secondary">(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="invitado@empresa.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Celular / WhatsApp <span className="text-xs font-normal text-secondary">(Opcional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. +505 8888-8888"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 px-4 bg-surface hover:bg-surface-variant text-on-surface font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 px-4 bg-primary text-on-primary font-bold rounded-xl text-sm hover:brightness-110 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? 'Generando Enlace...' : 'Generar Enlace Único'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Invitado Existente */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 size={20} />
                <h3 className="font-bold text-base">Editar Datos del Invitado</h3>
              </div>
              <button onClick={() => setEditModal({ open: false, invite: null })} className="p-1 hover:bg-white/20 rounded-full text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditGuest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Lista / Patrocinador Asignado
                </label>
                <select
                  value={editSponsor}
                  onChange={(e) => setEditSponsor(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary font-medium"
                >
                  <option value="general">⭐ Invitación General (ExpoFerre Oficial)</option>
                  {sponsorsList.map(sp => (
                    <option key={sp} value={sp}>🏢 {sp} {sponsorsMap[sp]?.stands ? `(Stand ${sponsorsMap[sp].stands.join(', ')})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Nombre del Invitado
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Empresa del Invitado
                </label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Celular / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, invite: null })}
                  className="flex-1 py-3 px-4 bg-surface hover:bg-surface-variant text-on-surface font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingGuest}
                  className="flex-1 py-3 px-4 bg-primary text-on-primary font-bold rounded-xl text-sm hover:brightness-110 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingGuest ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Configurar Artes & Speech de Patrocinador */}
      {artModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Palette size={22} className="text-amber-400" />
                <div>
                  <h3 className="font-bold text-base">{artModal.sponsorName}</h3>
                  <p className="text-white/80 text-xs">Configuración de Artes (Header/Footer), Stands y Speech</p>
                </div>
              </div>
              <button onClick={handleCloseArtModal} className="p-1 hover:bg-white/20 rounded-full text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-outline-variant bg-surface shrink-0 px-6 pt-2">
              <button
                onClick={() => setArtTab('banners')}
                className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  artTab === 'banners' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                <ImageIcon size={15} />
                Banners Correo
              </button>

              <button
                onClick={() => setArtTab('whatsapp')}
                className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  artTab === 'whatsapp' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                <Phone size={15} />
                Artes WhatsApp (Flyers)
              </button>

              <button
                onClick={() => setArtTab('speech')}
                className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  artTab === 'speech' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                <Sparkles size={15} />
                WhatsApp & Correo
              </button>

              <button
                onClick={() => setArtTab('preview')}
                className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  artTab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                <Eye size={15} />
                Previsualización en Vivo
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {artTab === 'banners' && (
                <div className="space-y-6">
                  
                  {/* Stand(s) */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                      Stand(s) Asignados en la Feria
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Stand 1, 2, 3 y 4"
                      value={artStands}
                      onChange={(e) => setArtStands(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary font-medium"
                    />
                    <p className="text-[11px] text-secondary mt-1">Este texto se insertará automáticamente en el WhatsApp y en el correo de invitación.</p>
                  </div>

                  {/* HEADER BANNER */}
                  <div className="bg-surface-variant/20 p-4 rounded-xl border border-outline-variant space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                          <ImageIcon size={16} className="text-primary" />
                          1. Header Banner Superior para Correo (1200 x 450 px)
                        </h4>
                        <p className="text-xs text-secondary">Arte principal con logo ExpoFerre + Patrocinador + Stand</p>
                      </div>
                    </div>

                    {artHeaderUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-outline-variant max-h-48 bg-slate-900">
                        <img src={artHeaderUrl} alt="Header Preview" className="w-full h-auto object-cover" />
                        <button
                          type="button"
                          onClick={() => setArtHeaderUrl('')}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-red-700 cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-outline-variant p-6 rounded-xl text-center bg-white space-y-2">
                        <ImageIcon size={32} className="mx-auto text-slate-400" />
                        <p className="text-xs text-secondary font-medium">Sube la imagen del Header o ingresa el enlace directo</p>
                        <div className="flex justify-center gap-3 pt-2">
                          <label className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5">
                            <FileUp size={14} />
                            {isUploadingHeader ? 'Subiendo...' : 'Subir Imagen'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadBannerImage(e, 'header')}
                              className="hidden"
                              disabled={isUploadingHeader}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-secondary uppercase mb-1">O escribe/pega la URL de la imagen:</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={artHeaderUrl}
                        onChange={(e) => setArtHeaderUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* FOOTER BANNER */}
                  <div className="bg-surface-variant/20 p-4 rounded-xl border border-outline-variant space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                        <ImageIcon size={16} className="text-primary" />
                        2. Footer Banner de Marcas Representadas para Correo (1200 x 250 px)
                      </h4>
                      <p className="text-xs text-secondary">Cinta inferior con la parrilla de marcas que exhibirán en el stand</p>
                    </div>

                    {artFooterUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-outline-variant max-h-36 bg-slate-900">
                        <img src={artFooterUrl} alt="Footer Preview" className="w-full h-auto object-cover" />
                        <button
                          type="button"
                          onClick={() => setArtFooterUrl('')}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-red-700 cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-outline-variant p-6 rounded-xl text-center bg-white space-y-2">
                        <ImageIcon size={32} className="mx-auto text-slate-400" />
                        <p className="text-xs text-secondary font-medium">Sube la imagen del Footer de marcas o ingresa el enlace directo</p>
                        <div className="flex justify-center gap-3 pt-2">
                          <label className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5">
                            <FileUp size={14} />
                            {isUploadingFooter ? 'Subiendo...' : 'Subir Imagen'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadBannerImage(e, 'footer')}
                              className="hidden"
                              disabled={isUploadingFooter}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-secondary uppercase mb-1">O escribe/pega la URL de la imagen:</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={artFooterUrl}
                        onChange={(e) => setArtFooterUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                </div>
              )}

              {artTab === 'whatsapp' && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl text-xs flex items-start gap-3 shadow-xs">
                    <Phone size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-sm text-emerald-950">Artes y Flyers Verticales para WhatsApp (Móvil):</span>
                      <p className="text-emerald-800 text-xs leading-relaxed">
                        WhatsApp es un canal móvil; los artes deben tener proporción vertical.
                        Dimensiones recomendadas: <strong className="text-emerald-950">1080 × 1920 px (Vertical 9:16 / Estado / Historia)</strong> o <strong className="text-emerald-950">1080 × 1350 px (Vertical 4:5)</strong> / 1080 × 1080 px (Cuadrado 1:1). Evita formatos horizontales de correo para WhatsApp.
                      </p>
                    </div>
                  </div>

                  {/* FLYER PRINCIPAL DE INVITACIÓN WHATSAPP */}
                  <div className="bg-surface-variant/20 p-5 rounded-2xl border border-outline-variant space-y-4">
                    <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                          <ImageIcon size={18} className="text-emerald-600" />
                          1. Flyer Vertical de Invitación para WhatsApp
                        </h4>
                        <p className="text-xs text-secondary mt-0.5">
                          Formato Vertical Móvil: <strong>1080 × 1920 px</strong> (9:16) o <strong>1080 × 1350 px</strong> (4:5)
                        </p>
                      </div>
                      {artWhatsappBannerUrl && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] border border-emerald-200">
                          ✓ Asignado
                        </span>
                      )}
                    </div>

                    {artWhatsappBannerUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 flex items-center justify-center min-h-[280px] max-h-[400px] max-w-xs mx-auto p-2 shadow-xl group">
                        <img 
                          src={artWhatsappBannerUrl} 
                          alt="Flyer WhatsApp Invitación" 
                          className="max-h-[380px] w-auto max-w-full object-contain rounded-xl shadow-md" 
                        />
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadImage(artWhatsappBannerUrl, `Arte_WhatsApp_Invitacion_${artModal.sponsorKey}.png`)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold shadow-lg cursor-pointer flex items-center gap-1 transition-transform hover:scale-105"
                            title="Descargar imagen"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setArtWhatsappBannerUrl('')}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl text-xs font-bold shadow-lg cursor-pointer transition-transform hover:scale-105"
                            title="Quitar flyer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-outline-variant p-6 rounded-2xl text-center bg-white space-y-3 max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                          <Phone size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-on-surface">Subir Flyer Vertical de Invitación</p>
                          <p className="text-[11px] text-secondary mt-0.5">Recomendado: 1080 × 1920 px (9:16) o 1080 × 1350 px (4:5)</p>
                        </div>
                        <div className="flex justify-center pt-1">
                          <label className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-sm">
                            <FileUp size={15} />
                            {isUploadingWhatsapp ? 'Subiendo Flyer...' : 'Subir Flyer Vertical'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadBannerImage(e, 'whatsapp')}
                              className="hidden"
                              disabled={isUploadingWhatsapp}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-secondary uppercase mb-1">O escribe/pega la URL del Flyer Vertical de WhatsApp:</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={artWhatsappBannerUrl}
                        onChange={(e) => setArtWhatsappBannerUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* FLYER DE RECORDATORIO DE REGISTRO WHATSAPP */}
                  <div className="bg-surface-variant/20 p-5 rounded-2xl border border-outline-variant space-y-4">
                    <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                          <Bell size={18} className="text-amber-600" />
                          2. Flyer Vertical de Recordatorio para WhatsApp
                        </h4>
                        <p className="text-xs text-secondary mt-0.5">
                          Formato Vertical Móvil: <strong>1080 × 1920 px</strong> (9:16) o <strong>1080 × 1350 px</strong> (4:5)
                        </p>
                      </div>
                      {artWhatsappReminderBannerUrl && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] border border-amber-200">
                          ✓ Asignado
                        </span>
                      )}
                    </div>

                    {artWhatsappReminderBannerUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 flex items-center justify-center min-h-[280px] max-h-[400px] max-w-xs mx-auto p-2 shadow-xl group">
                        <img 
                          src={artWhatsappReminderBannerUrl} 
                          alt="Flyer WhatsApp Recordatorio" 
                          className="max-h-[380px] w-auto max-w-full object-contain rounded-xl shadow-md" 
                        />
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadImage(artWhatsappReminderBannerUrl, `Arte_WhatsApp_Recordatorio_${artModal.sponsorKey}.png`)}
                            className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-xl text-xs font-bold shadow-lg cursor-pointer flex items-center gap-1 transition-transform hover:scale-105"
                            title="Descargar imagen"
                          >
                            <Download size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setArtWhatsappReminderBannerUrl('')}
                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl text-xs font-bold shadow-lg cursor-pointer transition-transform hover:scale-105"
                            title="Quitar flyer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-outline-variant p-6 rounded-2xl text-center bg-white space-y-3 max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                          <Bell size={24} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-on-surface">Subir Flyer Vertical de Recordatorio</p>
                          <p className="text-[11px] text-secondary mt-0.5">Recomendado: 1080 × 1920 px (9:16) o 1080 × 1350 px (4:5)</p>
                        </div>
                        <div className="flex justify-center pt-1">
                          <label className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-sm">
                            <FileUp size={15} />
                            {isUploadingWhatsappReminder ? 'Subiendo Recordatorio...' : 'Subir Flyer Vertical'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleUploadBannerImage(e, 'whatsapp_reminder')}
                              className="hidden"
                              disabled={isUploadingWhatsappReminder}
                            />
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <label className="block text-[11px] font-bold text-secondary uppercase mb-1">O escribe/pega la URL del Flyer de Recordatorio:</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={artWhatsappReminderBannerUrl}
                        onChange={(e) => setArtWhatsappReminderBannerUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface border border-outline-variant rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                </div>
              )}

              {artTab === 'speech' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                      Asunto del Correo Electrónico
                    </label>
                    <input
                      type="text"
                      placeholder={`Invitación Exclusiva por cortesía de ${artModal.sponsorName} - EXPO FERRE 2026`}
                      value={artCustomSubject}
                      onChange={(e) => setArtCustomSubject(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-on-surface uppercase tracking-wider">
                        Texto Personalizado para WhatsApp
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setArtCustomSpeech(`¡Hola {invitado}! 👋 Te saludamos en nombre de ${artModal.sponsorName} y el comité organizador de EXPO FERRE Nicaragua 2026.

Tenemos el agrado de extenderte una invitación especial y exclusiva para que nos acompañes y nos visites en nuestro ${artStands ? `Stand ${artStands}` : 'stand oficial'}.

📅 Fecha: 16 y 17 de Octubre de 2026
📍 Lugar: Centro de Convenciones Crowne Plaza, Managua

Hemos reservado para ti un pase preferencial. Para activar tu acceso y recibir tu Gafete Oficial con Código QR, por favor completa tu registro en el siguiente enlace único:

🔗 {enlace}

⚠️ Nota: Este enlace es personal, intransferible y de un solo uso.

¡Será un verdadero honor recibirte en nuestro stand! 🚀`);
                        }}
                        className="text-xs text-primary underline font-bold hover:brightness-110 cursor-pointer"
                      >
                        Restablecer plantilla sugerida
                      </button>
                    </div>

                    <textarea
                      rows={9}
                      value={artCustomSpeech}
                      onChange={(e) => setArtCustomSpeech(e.target.value)}
                      placeholder="Deja vacío para usar el formato oficial estándar, o escribe tu propio mensaje aquí..."
                      className="w-full p-4 bg-surface border border-outline-variant rounded-xl text-xs font-mono outline-none focus:border-primary leading-relaxed"
                    />

                    <div className="flex flex-wrap gap-1.5 pt-2 items-center">
                      <span className="text-[11px] text-secondary font-bold">Variables disponibles:</span>
                      {['{invitado}', '{empresa_invitada}', '{patrocinador}', '{stands}', '{enlace}'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setArtCustomSpeech(prev => prev + ' ' + tag)}
                          className="px-2 py-1 bg-surface-variant hover:bg-primary/20 text-on-surface rounded-md text-[11px] font-mono font-bold cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {artTab === 'preview' && (
                <div className="space-y-5">
                  {/* Selector de Canal de Previsualización */}
                  <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-surface-variant/40 rounded-2xl max-w-xl mx-auto border border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setArtPreviewChannel('email')}
                      className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        artPreviewChannel === 'email'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-secondary hover:text-on-surface hover:bg-surface'
                      }`}
                    >
                      <Mail size={14} />
                      <span>📧 Correo Electrónico</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtPreviewChannel('whatsapp_invite')}
                      className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        artPreviewChannel === 'whatsapp_invite'
                          ? 'bg-[#075E54] text-white shadow-sm'
                          : 'text-secondary hover:text-on-surface hover:bg-surface'
                      }`}
                    >
                      <MessageSquare size={14} />
                      <span>📲 WhatsApp (Invitación)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtPreviewChannel('whatsapp_reminder')}
                      className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        artPreviewChannel === 'whatsapp_reminder'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-secondary hover:text-on-surface hover:bg-surface'
                      }`}
                    >
                      <Bell size={14} />
                      <span>🔔 WhatsApp (Recordatorio)</span>
                    </button>
                  </div>

                  {/* VISTA PREVIA: CORREO ELECTRÓNICO */}
                  {artPreviewChannel === 'email' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl text-xs flex items-center gap-2">
                        <Eye size={16} className="text-blue-600 shrink-0" />
                        <span>Así es como el invitado verá el correo formal con Header y Footer de marcas.</span>
                      </div>

                      <div className="border border-outline-variant rounded-2xl overflow-hidden shadow-md max-w-lg mx-auto bg-white">
                        {/* Header Image */}
                        <img
                          src={artHeaderUrl || 'https://expoferrenicaragua.com/email-header.png'}
                          alt="Header Preview"
                          className="w-full h-auto object-cover"
                        />
                        
                        <div className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
                          {artCustomSpeech && artCustomSpeech.trim() ? (
                            <div className="space-y-3">
                              {artCustomSpeech
                                .replace(/{invitado}/g, 'Carlos Mendoza')
                                .replace(/\[Nombre\]/g, 'Carlos Mendoza')
                                .replace(/{empresa_invitada}/g, 'Ferretería El Progreso')
                                .replace(/{patrocinador}/g, artModal.sponsorName)
                                .replace(/{stands}/g, artStands ? (artStands.toLowerCase().startsWith('stand') ? artStands : `Stand ${artStands}`) : 'nuestro stand')
                                .split('\n\n')
                                .map((paragraph, pIdx) => {
                                  if (paragraph.includes('{enlace}')) {
                                    return (
                                      <div key={pIdx} className="my-3">
                                        <div className="text-center py-2">
                                          <span className="inline-block bg-[#f39200] text-white px-6 py-2.5 rounded-lg font-bold shadow-xs text-xs">
                                            🎟️ Activar Mi Pase Exclusivo
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (paragraph.includes('📅') || paragraph.includes('📍') || paragraph.includes('⏰') || paragraph.includes('🏢')) {
                                    return (
                                      <div key={pIdx} className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px] space-y-1 font-medium text-slate-800 my-2">
                                        {paragraph.split('\n').map((line, lIdx) => (
                                          <p key={lIdx}>{line}</p>
                                        ))}
                                      </div>
                                    );
                                  }

                                  return (
                                    <p key={pIdx} className="whitespace-pre-line text-slate-600 leading-relaxed">
                                      {paragraph}
                                    </p>
                                  );
                                })}

                              {!artCustomSpeech.includes('{enlace}') && (
                                <div className="pt-2">
                                  <div className="text-center py-2">
                                    <span className="inline-block bg-[#f39200] text-white px-6 py-2.5 rounded-lg font-bold shadow-xs text-xs">
                                      🎟️ Activar Mi Pase Exclusivo
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <h3 className="font-bold text-base text-[#0d47a1]">¡Hola Carlos Mendoza!</h3>
                              <p className="text-slate-600 leading-relaxed">
                                Te saludamos cordialmente en nombre de <strong>{artModal.sponsorName}</strong> y el comité organizador de <strong>EXPO FERRE Nicaragua 2026</strong>.
                              </p>
                              <p className="text-slate-600 leading-relaxed">
                                Tenemos el agrado de invitarte de forma exclusiva para que nos acompañes y conozcas nuestras últimas innovaciones en el <strong>{artStands ? (artStands.toLowerCase().startsWith('stand') ? artStands : `Stand ${artStands}`) : 'Stand Oficial'}</strong>.
                              </p>
                              
                              <div className="text-center py-4">
                                <span className="inline-block bg-[#f39200] text-white px-6 py-2.5 rounded-lg font-bold shadow-xs">
                                  🎟️ Activar Mi Pase Exclusivo
                                </span>
                              </div>

                              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px]">
                                <p>📅 <strong>Fecha:</strong> 17 de Octubre de 2026</p>
                                <p>📍 <strong>Lugar:</strong> Centro de Convenciones Crowne Plaza, Managua</p>
                                <p>🏢 <strong>Stand:</strong> {artStands ? (artStands.toLowerCase().startsWith('stand') ? artStands : `Stand ${artStands}`) : 'Stand Oficial'} ({artModal.sponsorName})</p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Footer Image */}
                        <img
                          src={artFooterUrl || 'https://expoferrenicaragua.com/email-footer.png'}
                          alt="Footer Preview"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* VISTA PREVIA: WHATSAPP (INVITACIÓN O RECORDATORIO) */}
                  {(artPreviewChannel === 'whatsapp_invite' || artPreviewChannel === 'whatsapp_reminder') && (() => {
                    const isRem = artPreviewChannel === 'whatsapp_reminder';
                    const activeFlyer = isRem 
                      ? (artWhatsappReminderBannerUrl || artWhatsappBannerUrl) 
                      : artWhatsappBannerUrl;

                    return (
                      <div className="space-y-4">
                        <div className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                          isRem 
                            ? 'bg-amber-50 border-amber-200 text-amber-900' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}>
                          <div className="flex items-center gap-2">
                            <Phone size={16} className={isRem ? 'text-amber-600' : 'text-emerald-600'} />
                            <span>
                              {isRem 
                                ? 'Simulación en WhatsApp: Flyer vertical de recordatorio + enlace único directo.' 
                                : 'Simulación en WhatsApp: Flyer vertical con arte oficial + enlace único de registro.'}
                            </span>
                          </div>
                          {activeFlyer && (
                            <button
                              type="button"
                              onClick={() => handleDownloadImage(activeFlyer, `Flyer_WhatsApp_${isRem ? 'Recordatorio' : 'Invitacion'}_${artModal.sponsorKey}.png`)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded-lg font-bold text-[11px] border border-slate-300 shadow-2xs flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Download size={12} />
                              Descargar Flyer
                            </button>
                          )}
                        </div>

                        {/* Maqueta Smartphone / WhatsApp Chat */}
                        <div className="max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-[#efeae2] flex flex-col font-sans">
                          
                          {/* Barra Superior WhatsApp */}
                          <div className="bg-[#075E54] text-white px-3.5 py-3 flex items-center justify-between shadow-sm shrink-0">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-xs text-white uppercase overflow-hidden shrink-0">
                                {artModal.sponsorName ? artModal.sponsorName.substring(0, 2) : 'EF'}
                              </div>
                              <div className="leading-tight">
                                <h5 className="font-bold text-xs text-white truncate max-w-[170px]">
                                  Carlos Mendoza
                                </h5>
                                <span className="text-[10px] text-emerald-200">en línea</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-white/90">
                              <Phone size={14} />
                              <Sparkles size={14} />
                            </div>
                          </div>

                          {/* Área de Conversación */}
                          <div className="p-3.5 space-y-3 min-h-[380px] flex flex-col justify-end">
                            
                            {/* Fecha Hoy */}
                            <div className="text-center">
                              <span className="bg-white/80 shadow-2xs text-[10px] text-slate-600 font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                                Hoy
                              </span>
                            </div>

                            {/* Burbuja de Mensaje Enviada (Flyer + Enlace Único) */}
                            <div className="bg-[#d9fdd3] text-slate-900 rounded-2xl rounded-tr-xs p-2.5 shadow-sm max-w-[96%] ml-auto space-y-2.5 border border-[#c1e8ba]">
                              
                              {/* Arte Vertical WhatsApp */}
                              {activeFlyer ? (
                                <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-700/50 shadow-xs flex items-center justify-center">
                                  <img 
                                    src={activeFlyer} 
                                    alt="Flyer Vertical WhatsApp" 
                                    className="w-full h-auto max-h-[380px] object-contain mx-auto"
                                  />
                                </div>
                              ) : (
                                <div className="p-4 bg-emerald-900/10 border border-dashed border-emerald-600/40 rounded-xl text-center space-y-1 text-emerald-950">
                                  <ImageIcon size={26} className="mx-auto text-emerald-700" />
                                  <p className="text-xs font-bold">Sin flyer vertical cargado</p>
                                  <p className="text-[10px] text-emerald-800 leading-tight">
                                    Sube tu arte en formato <strong>1080 × 1920 px</strong> en la pestaña &apos;Artes WhatsApp&apos;.
                                  </p>
                                </div>
                              )}

                              {/* Texto Directo: Saludo + Enlace de Registro */}
                              <div className="text-[11.5px] leading-relaxed text-slate-900 space-y-1.5 px-0.5">
                                <p className="font-semibold text-slate-800">
                                  {isRem 
                                    ? '🔔 ¡Hola Carlos Mendoza! Te recordamos activar tu pase exclusivo completando tu registro en este enlace:' 
                                    : '¡Hola Carlos Mendoza! 👋 Activa tu pase exclusivo completando tu registro en este enlace:'}
                                </p>

                                <div className="bg-white/90 p-2 rounded-xl border border-emerald-300 shadow-2xs text-emerald-950 space-y-0.5">
                                  <p className="font-bold text-[10.5px]">🎟️ Enlace Exclusivo:</p>
                                  <p className="text-[10px] font-mono font-bold text-blue-600 break-all underline">
                                    https://expoferrenicaragua.com/?invite=inv_carlos_mendoza
                                  </p>
                                </div>
                              </div>

                              {/* Hora y Visto Azul */}
                              <div className="flex items-center justify-end gap-1 text-[9.5px] text-slate-500 pt-0.5 pr-1">
                                <span>10:42 a. m.</span>
                                <span className="text-[#34B7F1] font-bold text-xs leading-none">✓✓</span>
                              </div>

                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })()}

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-variant/30 border-t border-outline-variant flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                disabled={isSavingArt}
                onClick={handleCloseArtModal}
                className="py-2.5 px-4 bg-white border border-outline-variant hover:bg-surface text-on-surface font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingArt}
                onClick={handleSaveSponsorArt}
                className="py-2.5 px-6 bg-primary text-on-primary font-bold rounded-xl text-xs hover:brightness-110 transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                <Check size={16} />
                {isSavingArt ? 'Guardando...' : 'Guardar Configuración de Artes'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Enviar Invitación / Recordatorio por WhatsApp con Arte de Patrocinador */}
      {whatsAppModal.open && whatsAppModal.invite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-[#075E54] p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center font-bold shadow-md">
                  <Phone size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    {whatsAppModal.isReminder ? '🔔 Recordatorio de Registro por WhatsApp' : '📲 Invitación Oficial por WhatsApp'}
                  </h3>
                  <p className="text-white/80 text-xs">
                    Destinatario: <span className="font-bold text-white">{whatsAppModal.invite.nombre || 'Invitado sin nombre'}</span> {whatsAppModal.invite.empresa ? `(${whatsAppModal.invite.empresa})` : ''} • Patrocinador: <span className="font-bold text-amber-300">{whatsAppModal.invite.sponsorName || 'General'}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setWhatsAppModal({ open: false, invite: null, isReminder: false })} 
                className="p-1 hover:bg-white/20 rounded-full text-white cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector de Modo: Invitación Inicial vs Recordatorio */}
            <div className="flex border-b border-outline-variant bg-surface px-6 pt-3 shrink-0 gap-2">
              <button
                onClick={() => setWhatsAppModal(prev => ({ ...prev, isReminder: false }))}
                className={`py-2 px-4 font-bold text-xs rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                  !whatsAppModal.isReminder ? 'border-[#25D366] text-[#075E54] bg-emerald-50/60' : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                <MessageSquare size={14} />
                Invitación Inicial
              </button>
              <button
                onClick={() => setWhatsAppModal(prev => ({ ...prev, isReminder: true }))}
                className={`py-2 px-4 font-bold text-xs rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
                  whatsAppModal.isReminder ? 'border-amber-500 text-amber-700 bg-amber-50/60' : 'border-transparent text-secondary hover:text-on-surface'
                }`}
              >
                <Bell size={14} />
                Recordatorio de Activación
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {(() => {
                const inv = whatsAppModal.invite;
                const isRem = whatsAppModal.isReminder;
                const spName = inv.sponsorName || 'general';
                const art = getSponsorArt(spName);
                const currentFlyerUrl = isRem ? (art.whatsappReminderBannerUrl || art.whatsappBannerUrl) : art.whatsappBannerUrl;
                const speechText = isRem ? getWhatsAppReminderSpeech(inv) : getWhatsAppSpeech(inv);
                const waUrl = isRem ? getWhatsAppReminderUrl(inv) : getWhatsAppUrl(inv);
                const isCopied = copiedToken === (isRem ? `wa_rem_${inv.id}` : `wa_${inv.id}`);

                return (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    
                    {/* Columna Izquierda: Flyer de WhatsApp */}
                    <div className="md:col-span-5 space-y-3 flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon size={15} className="text-[#25D366]" />
                          Arte Oficial {isRem ? 'Recordatorio' : 'Invitación'}
                        </span>
                        {spName && spName !== 'general' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {spName}
                          </span>
                        )}
                      </div>

                      {/* Vista Previa de Flyer Vertical */}
                      <div className="bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center min-h-[280px] max-h-[360px] p-2.5 relative group shadow-inner">
                        {currentFlyerUrl ? (
                          <img 
                            src={currentFlyerUrl} 
                            alt="Flyer WhatsApp" 
                            className="max-h-[340px] w-auto max-w-full object-contain rounded-xl shadow-md"
                          />
                        ) : (
                          <div className="text-center p-6 text-slate-400 space-y-2">
                            <Phone size={36} className="mx-auto text-emerald-500/70" />
                            <p className="text-xs font-medium">Sin flyer vertical configurado</p>
                            <p className="text-[10px] text-slate-400">Puedes configurarlo en la sección de Artes (1080x1920 px).</p>
                          </div>
                        )}
                      </div>

                      {/* Botón Descargar Arte */}
                      <div className="space-y-2 pt-1">
                        <button
                          type="button"
                          disabled={!currentFlyerUrl}
                          onClick={() => handleDownloadImage(currentFlyerUrl, `Arte_WhatsApp_${isRem ? 'Recordatorio' : 'Invitacion'}_${getSponsorKey(spName)}.png`)}
                          className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                        >
                          <Download size={15} />
                          <span>1. Descargar Arte Gráfico</span>
                        </button>
                        
                        {currentFlyerUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(currentFlyerUrl);
                              setCopiedToken(`flyer_${inv.id}`);
                              setTimeout(() => setCopiedToken(null), 2000);
                            }}
                            className="w-full py-1.5 px-3 bg-surface hover:bg-surface-variant text-secondary hover:text-on-surface rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 border border-outline-variant cursor-pointer"
                          >
                            {copiedToken === `flyer_${inv.id}` ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                            <span>{copiedToken === `flyer_${inv.id}` ? '¡Enlace del Arte Copiado!' : 'Copiar URL de la imagen'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Columna Derecha: Speech Personalizado y Acciones */}
                    <div className="md:col-span-7 space-y-3 flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare size={15} className="text-[#25D366]" />
                          Mensaje Personalizado con Enlace Único
                        </span>
                        {inv.telefono && (
                          <span className="text-xs text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                            📱 {inv.telefono}
                          </span>
                        )}
                      </div>

                      {/* Cuadro de Texto de WhatsApp */}
                      <textarea
                        readOnly
                        rows={10}
                        value={speechText}
                        className="w-full p-3.5 bg-slate-50 border border-outline-variant rounded-xl text-xs font-mono text-slate-800 outline-none resize-none leading-relaxed flex-1 shadow-inner select-all"
                      />

                      {/* Envío Automático Directo por WATI API */}
                      <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                            <Zap size={14} className="text-emerald-600 fill-emerald-600" />
                            Envío Directo Automatizado (WATI API)
                          </span>
                          {watiTemplateInfo && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              watiTemplateInfo.status === 'APPROVED' 
                                ? 'bg-emerald-200 text-emerald-900 border border-emerald-400' 
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                              Plantilla: {watiTemplateInfo.status === 'APPROVED' ? '✅ Aprobada Meta' : '⏳ En revisión Meta'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-snug">
                          Envía la plantilla oficial con el enlace único de acceso directamente al WhatsApp del invitado sin abrir WhatsApp Web ni interactuar manualmente.
                        </p>
                        <button
                          type="button"
                          disabled={!inv.telefono || isSendingWatiId === inv.id}
                          onClick={() => handleSendSingleWati(inv)}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isSendingWatiId === inv.id ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              <span>Enviando por WATI API...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={15} />
                              <span>⚡ Disparar Invitación por WATI Ahora</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Guía rápida de flujo */}
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                        <Sparkles size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Flujo Manual Alternativo:</strong> 1. Descarga el arte gráfico. 2. Presiona <strong>Abrir WhatsApp</strong>. 3. Pega el texto y adjunta la imagen descargada en el chat.
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => isRem ? handleCopyWhatsAppReminder(inv) : handleCopyWhatsApp(inv)}
                          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border ${
                            isCopied
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white hover:bg-surface text-slate-800 border-outline-variant'
                          }`}
                        >
                          {isCopied ? <Check size={16} /> : <Copy size={16} />}
                          <span>{isCopied ? '¡Texto Copiado!' : '2. Copiar Texto'}</span>
                        </button>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Send size={16} />
                          <span>3. Abrir WhatsApp</span>
                        </a>
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-variant/30 border-t border-outline-variant flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setWhatsAppModal({ open: false, invite: null, isReminder: false })}
                className="py-2 px-5 bg-white border border-outline-variant hover:bg-surface text-on-surface font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Vista Previa y Confirmación de Carga Masiva (Excel) */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-blue-600 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileUp size={22} />
                <div>
                  <h3 className="font-bold text-base">Carga Masiva de Invitaciones</h3>
                  <p className="text-white/80 text-xs">Asigna a una lista o detecta automáticamente por patrocinador</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (!isBulkSaving) {
                    setShowBulkModal(false);
                    setBulkData([]);
                  }
                }} 
                disabled={isBulkSaving}
                className="p-1 hover:bg-white/20 rounded-full text-white disabled:opacity-50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido / Tabla de Vista Previa */}
            {(() => {
              const newRows = bulkData.filter(item => !isExistingInvite(item, invites));
              const duplicateRows = bulkData.filter(item => !!isExistingInvite(item, invites));
              const targetCount = skipBulkDuplicates ? newRows.length : bulkData.length;

              return (
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  
                  {/* Tarjetas de Diagnóstico de Duplicados */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                      <span className="text-secondary block text-[10px] uppercase font-bold">Total en Archivo</span>
                      <span className="text-xl font-black text-slate-800">{bulkData.length}</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-center">
                      <span className="text-emerald-700 block text-[10px] uppercase font-bold">Nuevos Contactos</span>
                      <span className="text-xl font-black text-emerald-900">{newRows.length}</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
                      <span className="text-amber-800 block text-[10px] uppercase font-bold">Ya Registrados</span>
                      <span className="text-xl font-black text-amber-900">{duplicateRows.length}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 text-blue-950 p-4 rounded-xl text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Users size={18} className="text-blue-600 shrink-0" />
                        <span>
                          Se crearán <strong>{targetCount} invitaciones nuevas</strong> con enlaces únicos.
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-xs font-bold text-blue-950 shrink-0">Asignar a:</label>
                        <select
                          value={bulkTargetSponsor}
                          onChange={(e) => setBulkTargetSponsor(e.target.value)}
                          className="bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none"
                        >
                          <option value="auto">⚡ Detectar automáticamente por Pestaña / Columna</option>
                          <option value="general">⭐ Forzar Todos a Invitación General</option>
                          {sponsorsList.map(sp => (
                            <option key={sp} value={sp}>🏢 Forzar Todos a {sp}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Toggle Protección contra Duplicados */}
                    {duplicateRows.length > 0 && (
                      <div className="pt-2 border-t border-blue-200/70 flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-[11px] text-blue-900">
                          <input
                            type="checkbox"
                            checked={skipBulkDuplicates}
                            onChange={(e) => setSkipBulkDuplicates(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-0"
                          />
                          <span>🛡️ Omitir los {duplicateRows.length} contactos ya existentes (Recomendado para no sobreescribir ni duplicar tokens)</span>
                        </label>
                      </div>
                    )}

                    {/* Desglose por Patrocinador / Pestañas */}
                    {bulkTargetSponsor === 'auto' && (() => {
                      const sponsorCounts = {};
                      bulkData.forEach(d => {
                        const sp = d.patrocinador || 'General';
                        sponsorCounts[sp] = (sponsorCounts[sp] || 0) + 1;
                      });
                      const entries = Object.entries(sponsorCounts);
                      if (entries.length <= 1 && !bulkData[0]?.sheetName) return null;

                      return (
                        <div className="pt-2 border-t border-blue-200/60">
                          <span className="text-[11px] font-bold text-blue-900 block mb-1.5">Distribución por Pestaña / Patrocinador detectado ({entries.length}):</span>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {entries.map(([spName, count]) => (
                              <span key={spName} className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-900 px-2.5 py-1 rounded-md text-[11px] font-bold shadow-2xs">
                                🏢 {spName}: <span className="text-blue-600 font-black">{count}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Tabla con scroll */}
                  <div className="border border-outline-variant rounded-xl overflow-hidden shadow-2xs">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-surface-variant/70 sticky top-0 border-b border-outline-variant text-secondary">
                          <tr>
                            <th className="p-3 font-bold text-center w-10">#</th>
                            <th className="p-3 font-bold">Estado</th>
                            <th className="p-3 font-bold">Nombre</th>
                            <th className="p-3 font-bold">Empresa</th>
                            <th className="p-3 font-bold">Correo</th>
                            <th className="p-3 font-bold">Teléfono</th>
                            <th className="p-3 font-bold">Patrocinador</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/60">
                          {bulkData.map((item, idx) => {
                            const isDup = isExistingInvite(item, invites);
                            return (
                              <tr key={idx} className={`transition-colors ${isDup ? (skipBulkDuplicates ? 'bg-amber-50/40 text-slate-400 opacity-75' : 'bg-amber-50/60') : 'hover:bg-surface-variant/20'}`}>
                                <td className="p-2.5 text-center font-mono text-secondary">{idx + 1}</td>
                                <td className="p-2.5 whitespace-nowrap">
                                  {isDup ? (
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-200" title="Este contacto ya tiene una invitación en el sistema">
                                      {skipBulkDuplicates ? 'Omitido (Ya existe)' : 'Ya existe'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-200">
                                      + Nuevo
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 font-bold text-on-surface">{item.nombre || <span className="text-slate-400 italic">Sin nombre</span>}</td>
                                <td className="p-2.5 text-on-surface">{item.empresa || <span className="text-slate-400 italic">Sin empresa</span>}</td>
                                <td className="p-2.5 font-mono text-slate-600">{item.email || <span className="text-slate-400 italic">Sin correo</span>}</td>
                                <td className="p-2.5 font-mono text-slate-600">{item.telefono || <span className="text-slate-400 italic">Sin teléfono</span>}</td>
                                <td className="p-2.5 font-bold text-slate-800">
                                  {bulkTargetSponsor !== 'auto' ? (bulkTargetSponsor === 'general' ? 'General' : bulkTargetSponsor) : (item.patrocinador || 'General')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Barra de Progreso */}
                  {isBulkSaving && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs font-bold text-on-surface">
                        <span>Generando enlaces de invitación...</span>
                        <span>{bulkProgress.current} / {bulkProgress.total}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full transition-all duration-200"
                          style={{ width: `${(bulkProgress.current / (bulkProgress.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}

            {/* Footer */}
            {(() => {
              const newRows = bulkData.filter(item => !isExistingInvite(item, invites));
              const targetCount = skipBulkDuplicates ? newRows.length : bulkData.length;

              return (
                <div className="p-4 bg-surface-variant/30 border-t border-outline-variant flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    disabled={isBulkSaving}
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkData([]);
                    }}
                    className="py-2.5 px-4 bg-white border border-outline-variant hover:bg-surface text-on-surface font-bold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isBulkSaving || targetCount === 0}
                    onClick={handleConfirmBulkUpload}
                    className="py-2.5 px-5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <FileUp size={16} />
                    {isBulkSaving 
                      ? `Importando (${bulkProgress.current}/${bulkProgress.total})...` 
                      : `Importar ${targetCount} Contacto(s) Nuevo(s)`}
                  </button>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* MODAL: Enviar Correo Oficial */}
      {emailModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-5 text-on-primary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={20} />
                <h3 className="font-bold text-base">Enviar Invitación por Correo</h3>
              </div>
              <button onClick={() => setEmailModal({ open: false, invite: null })} className="p-1 hover:bg-white/20 rounded-full text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendEmailDirect} className="p-6 space-y-4">
              {emailSuccess ? (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                  <span>{emailSuccess}</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-secondary leading-relaxed">
                    Se enviará el correo formal con el <strong>Header Banner</strong> y <strong>Footer de Marcas</strong> de{' '}
                    <strong>{emailModal.invite?.sponsorName || 'Expo Ferre 2026'}</strong>.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                      Correo Electrónico del Destinatario <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="invitado@empresa.com"
                      value={emailModal.invite?.targetEmail || ''}
                      onChange={(e) => setEmailModal(prev => ({
                        ...prev,
                        invite: { ...prev.invite, targetEmail: e.target.value }
                      }))}
                      className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEmailModal({ open: false, invite: null })}
                      className="flex-1 py-2.5 px-4 bg-surface hover:bg-surface-variant text-on-surface font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingEmail || !emailModal.invite?.targetEmail?.trim()}
                      className="flex-1 py-2.5 px-4 bg-primary text-on-primary font-bold rounded-xl text-xs hover:brightness-110 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send size={14} />
                      {isSendingEmail ? 'Enviando...' : 'Enviar Invitación'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Envío Masivo de Correos por Patrocinador */}
      {bulkEmailModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-amber-600 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <MailCheck size={22} />
                <div>
                  <h3 className="font-bold text-base">Envío Masivo de Invitaciones por Correo</h3>
                  <p className="text-white/80 text-xs">
                    {bulkEmailModal.sponsorName === 'all' 
                      ? 'Todas las listas activas' 
                      : bulkEmailModal.sponsorName === 'general' 
                      ? 'Lista General (ExpoFerre)' 
                      : `Lista Oficial de ${bulkEmailModal.sponsorName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isBulkSendingEmail) {
                    setBulkEmailModal({ open: false, sponsorName: 'general', sponsorDisplayName: '', filterType: 'never_sent' });
                    setBulkEmailResult(null);
                  }
                }}
                disabled={isBulkSendingEmail}
                className="p-1 hover:bg-white/20 rounded-full text-white disabled:opacity-50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {bulkEmailResult ? (
                <div className="space-y-4">
                  <div className={`p-5 rounded-xl text-center space-y-2 border ${
                    bulkEmailResult.wasStopped 
                      ? 'bg-amber-50 border-amber-200 text-amber-900' 
                      : bulkEmailResult.failed > 0 
                      ? 'bg-orange-50 border-orange-200 text-orange-900' 
                      : 'bg-green-50 border-green-200 text-green-900'
                  }`}>
                    {bulkEmailResult.wasStopped ? (
                      <AlertTriangle size={36} className="text-amber-600 mx-auto" />
                    ) : bulkEmailResult.failed > 0 ? (
                      <ShieldAlert size={36} className="text-orange-600 mx-auto" />
                    ) : (
                      <CheckCircle2 size={36} className="text-green-600 mx-auto" />
                    )}

                    <h4 className="font-bold text-lg">
                      {bulkEmailResult.wasStopped 
                        ? 'Envío Detenido por el Usuario' 
                        : bulkEmailResult.failed > 0 
                        ? 'Envío Finalizado con Observaciones' 
                        : '¡Envío Masivo Completado con Éxito!'}
                    </h4>

                    <p className="text-xs">
                      Se encolaron <strong>{bulkEmailResult.sent}</strong> de <strong>{bulkEmailResult.total}</strong> correos exitosamente.
                    </p>

                    {bulkEmailResult.wasStopped && (
                      <p className="text-xs text-amber-800 font-semibold">
                        El proceso se interrumpió de forma segura. Los correos restantes se pueden enviar en el siguiente lote.
                      </p>
                    )}
                  </div>

                  {/* Listado de Fallos si existen */}
                  {bulkEmailResult.failedList && bulkEmailResult.failedList.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                          <AlertCircle size={14} className="text-red-600" />
                          <span>Contactos que no se pudieron procesar ({bulkEmailResult.failedList.length}):</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const text = bulkEmailResult.failedList.map(f => `${f.name} <${f.email}>: ${f.error}`).join('\n');
                            navigator.clipboard.writeText(text);
                            alert('Lista de correos fallidos copiada al portapapeles.');
                          }}
                          className="text-[11px] font-bold text-red-700 hover:text-red-900 underline cursor-pointer"
                        >
                          📋 Copiar Fallidos
                        </button>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs">
                        {bulkEmailResult.failedList.map((f, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border border-red-100 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">{f.name} ({f.email})</span>
                            <span className="text-red-600 text-[10px]">{f.error || 'Error SMTP'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Resumen y Configuración de Destinatarios */}
                  {(() => {
                    const targetSp = bulkEmailModal.sponsorName;
                    const availableInvites = invites.filter(inv => {
                      if (targetSp === 'general') {
                        if (inv.sponsorName && inv.sponsorId !== 'general' && getSponsorKey(inv.sponsorName) !== 'general') return false;
                      } else if (targetSp !== 'all') {
                        if (!isMatchingSponsor(inv.sponsorName, targetSp) && inv.sponsorId !== getSponsorKey(targetSp)) return false;
                      }
                      return true;
                    });

                    const pendingTotal = availableInvites.filter(i => i.status === 'pending');
                    
                    // Separación por validez de correo
                    const withValidEmail = pendingTotal.filter(i => isValidEmailAddress(i.email));
                    const withInvalidEmail = pendingTotal.filter(i => i.email && !isValidEmailAddress(i.email));
                    const withoutEmail = pendingTotal.filter(i => !i.email || !i.email.trim());

                    const neverSent = withValidEmail.filter(i => !i.emailSentAt);
                    const alreadySent = withValidEmail.filter(i => i.emailSentAt);

                    const currentFilterTargets = bulkEmailModal.filterType === 'never_sent' 
                      ? neverSent 
                      : bulkEmailModal.filterType === 'only_already_sent_reminders'
                      ? alreadySent
                      : withValidEmail;
                    
                    // Cálculo de Lote Activo
                    const batchSize = bulkEmailModal.batchLimit === 'all' 
                      ? currentFilterTargets.length 
                      : Math.min(parseInt(bulkEmailModal.batchLimit, 10) || currentFilterTargets.length, currentFilterTargets.length);

                    // Estimación de tiempo
                    const delayMs = bulkEmailModal.paceSpeed === 'safe' ? 250 : bulkEmailModal.paceSpeed === 'normal' ? 120 : 40;
                    const estimatedSeconds = Math.ceil((batchSize * (delayMs + 60)) / 1000);

                    const spArt = getSponsorArt(targetSp);

                    return (
                      <div className="space-y-4">
                        
                        {/* Tarjeta Informativa del Arte Co-Brandeado */}
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700">Plantilla Oficial Co-Brandeada:</span>
                            <span className="text-[11px] font-bold text-slate-500">{spArt.stands ? `Stand: ${spArt.stands}` : 'Comité Organizador'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2.5">
                            <div className="w-20 h-10 bg-slate-800 rounded border border-slate-300 overflow-hidden shrink-0" title="Header Banner">
                              <img src={spArt.headerBannerUrl} alt="Header" className="w-full h-full object-cover" />
                            </div>
                            <div className="w-20 h-10 bg-slate-800 rounded border border-slate-300 overflow-hidden shrink-0" title="Footer Banner">
                              <img src={spArt.footerBannerUrl} alt="Footer" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-[11px] text-slate-600 leading-tight">
                              Header exclusivo + Stand oficial + Botón de acceso con token único + Cinta footer de marcas.
                            </div>
                          </div>
                        </div>

                        {/* Desglose de Diagnóstico de Destinatarios */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
                            <span className="text-secondary block text-[10px] uppercase font-bold">Listos (Primer Envío)</span>
                            <span className="text-xl font-black text-blue-900">{neverSent.length}</span>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                            <span className="text-secondary block text-[10px] uppercase font-bold">Ya Contactados</span>
                            <span className="text-xl font-black text-emerald-900">{alreadySent.length}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                            <span className="text-secondary block text-[10px] uppercase font-bold">Sin / Mal Correo</span>
                            <span className="text-xl font-black text-slate-600">{withoutEmail.length + withInvalidEmail.length}</span>
                          </div>
                        </div>

                        {/* Advertencia si hay correos con sintaxis inválida */}
                        {withInvalidEmail.length > 0 && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                            <span>
                              <strong>{withInvalidEmail.length}</strong> registro(s) tienen formato de correo inválido y serán omitidos automáticamente.
                            </span>
                          </div>
                        )}

                        {/* 1. Selector de Criterio */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-on-surface uppercase tracking-wider">
                            1. Criterio de Selección:
                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <label className={`flex items-start gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all ${
                              bulkEmailModal.filterType === 'never_sent' ? 'bg-amber-50/70 border-amber-400 text-amber-950 font-medium' : 'bg-surface border-outline-variant hover:bg-surface-variant/30 text-secondary'
                            }`}>
                              <input
                                type="radio"
                                name="bulkFilterType"
                                value="never_sent"
                                checked={bulkEmailModal.filterType === 'never_sent'}
                                onChange={() => setBulkEmailModal(prev => ({ ...prev, filterType: 'never_sent' }))}
                                className="mt-0.5"
                              />
                              <div className="text-xs">
                                <p className="font-bold text-on-surface">Primer Envío ({neverSent.length})</p>
                                <p className="text-[10px] text-secondary">Solo nunca enviados.</p>
                              </div>
                            </label>

                            <label className={`flex items-start gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all ${
                              bulkEmailModal.filterType === 'unregistered_reminder' || bulkEmailModal.filterType === 'all_pending' ? 'bg-blue-50/70 border-blue-400 text-blue-950 font-medium' : 'bg-surface border-outline-variant hover:bg-surface-variant/30 text-secondary'
                            }`}>
                              <input
                                type="radio"
                                name="bulkFilterType"
                                value="unregistered_reminder"
                                checked={bulkEmailModal.filterType === 'unregistered_reminder' || bulkEmailModal.filterType === 'all_pending'}
                                onChange={() => setBulkEmailModal(prev => ({ ...prev, filterType: 'unregistered_reminder' }))}
                                className="mt-0.5"
                              />
                              <div className="text-xs">
                                <p className="font-bold text-on-surface">🔔 Recordatorio Todos ({withValidEmail.length})</p>
                                <p className="text-[10px] text-secondary">A todos los pendientes.</p>
                              </div>
                            </label>

                            <label className={`flex items-start gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all ${
                              bulkEmailModal.filterType === 'only_already_sent_reminders' ? 'bg-indigo-50/70 border-indigo-400 text-indigo-950 font-medium' : 'bg-surface border-outline-variant hover:bg-surface-variant/30 text-secondary'
                            }`}>
                              <input
                                type="radio"
                                name="bulkFilterType"
                                value="only_already_sent_reminders"
                                checked={bulkEmailModal.filterType === 'only_already_sent_reminders'}
                                onChange={() => setBulkEmailModal(prev => ({ ...prev, filterType: 'only_already_sent_reminders' }))}
                                className="mt-0.5"
                              />
                              <div className="text-xs">
                                <p className="font-bold text-on-surface">🔔 Solo Reenvío ({alreadySent.length})</p>
                                <p className="text-[10px] text-secondary">Ya contactados antes.</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* 2. Selector de Lote / Bloques (Batching) */}
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-on-surface uppercase tracking-wider">
                            2. Tamaño del Lote a Despachar:
                          </label>

                          <div className="grid grid-cols-4 gap-2 text-xs">
                            {[
                              { id: 'all', label: `Todos (${currentFilterTargets.length})` },
                              { id: '25', label: 'Lote de 25' },
                              { id: '50', label: 'Lote de 50' },
                              { id: '100', label: 'Lote de 100' }
                            ].map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setBulkEmailModal(prev => ({ ...prev, batchLimit: opt.id }))}
                                className={`py-2 px-2 text-center rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                  bulkEmailModal.batchLimit === opt.id
                                    ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                                    : 'bg-white border-outline-variant hover:bg-surface-variant/40 text-on-surface'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Control de Ritmo y Antispam Pacing */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1">
                              <ShieldCheck size={13} className="text-emerald-600" />
                              3. Protección Antispam y Velocidad:
                            </label>
                            <span className="text-[11px] font-bold text-secondary flex items-center gap-1">
                              <Timer size={12} />
                              ~{estimatedSeconds}s estimado ({batchSize} correos)
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            {[
                              { id: 'safe', label: '🛡️ Seguro (250ms)', desc: 'Máxima entregabilidad' },
                              { id: 'normal', label: '⚡ Moderado (120ms)', desc: 'Equilibrado' },
                              { id: 'fast', label: '🚀 Rápido (40ms)', desc: 'Envíos pequeños' }
                            ].map(spd => (
                              <button
                                key={spd.id}
                                type="button"
                                onClick={() => setBulkEmailModal(prev => ({ ...prev, paceSpeed: spd.id }))}
                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                  bulkEmailModal.paceSpeed === spd.id
                                    ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold shadow-sm'
                                    : 'bg-white border-outline-variant hover:bg-surface-variant/30 text-secondary'
                                }`}
                              >
                                <span className="block text-[11px] font-bold text-on-surface">{spd.label}</span>
                                <span className="block text-[9px] text-secondary">{spd.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Barra de Progreso en Vivo con Botón de Detención */}
                        {isBulkSendingEmail && (
                          <div className="space-y-2 pt-2 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                            <div className="flex justify-between text-xs font-bold text-on-surface">
                              <span className="flex items-center gap-1.5 text-amber-800">
                                <RefreshCw size={13} className="animate-spin text-amber-600" />
                                Despachando correos ({bulkEmailProgress.current} de {bulkEmailProgress.total})...
                              </span>
                              <span className="text-amber-900 font-black">
                                {Math.round((bulkEmailProgress.current / (bulkEmailProgress.total || 1)) * 100)}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                              <div
                                className="bg-amber-600 h-full transition-all duration-150"
                                style={{ width: `${(bulkEmailProgress.current / (bulkEmailProgress.total || 1)) * 100}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-amber-900 pt-1">
                              <span>Fallidos: <strong>{bulkEmailProgress.failed}</strong></span>
                              <button
                                type="button"
                                onClick={handleStopBulkEmail}
                                className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow"
                              >
                                <StopCircle size={13} />
                                Detener Envío
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })()}
                </>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-variant/30 border-t border-outline-variant flex items-center justify-end gap-3 shrink-0">
              {bulkEmailResult ? (
                <button
                  type="button"
                  onClick={() => {
                    setBulkEmailModal({ open: false, sponsorName: 'general', sponsorDisplayName: '', filterType: 'never_sent', batchLimit: 'all', paceSpeed: 'safe' });
                    setBulkEmailResult(null);
                  }}
                  className="py-2.5 px-6 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-black transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isBulkSendingEmail}
                    onClick={() => setBulkEmailModal({ open: false, sponsorName: 'general', sponsorDisplayName: '', filterType: 'never_sent', batchLimit: 'all', paceSpeed: 'safe' })}
                    className="py-2.5 px-4 bg-white border border-outline-variant hover:bg-surface text-on-surface font-bold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isBulkSendingEmail}
                    onClick={handleExecuteBulkEmail}
                    className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <SendHorizontal size={16} />
                    {isBulkSendingEmail
                      ? `Enviando (${bulkEmailProgress.current}/${bulkEmailProgress.total})...`
                      : 'Iniciar Envío Masivo'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Envío Masivo de WhatsApp a través de WATI por Patrocinador */}
      {bulkWatiModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-emerald-700 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md">
                  <Zap size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    Envío Masivo por WhatsApp (WATI API)
                  </h3>
                  <p className="text-white/80 text-xs">
                    {bulkWatiModal.sponsorName === 'all' 
                      ? 'Todas las listas activas' 
                      : bulkWatiModal.sponsorName === 'general' 
                      ? 'Lista General (ExpoFerre)' 
                      : `Lista Oficial de ${bulkWatiModal.sponsorName}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isBulkSendingWati) {
                    setBulkWatiModal({ open: false, sponsorName: 'general', sponsorDisplayName: '', filterType: 'never_sent', batchLimit: 'all', paceSpeed: 'safe' });
                    setBulkWatiResult(null);
                  }
                }}
                disabled={isBulkSendingWati}
                className="p-1 hover:bg-white/20 rounded-full text-white disabled:opacity-50 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {bulkWatiResult ? (
                <div className="space-y-4">
                  <div className={`p-5 rounded-xl text-center space-y-2 border ${
                    bulkWatiResult.wasStopped 
                      ? 'bg-amber-50 border-amber-200 text-amber-900' 
                      : bulkWatiResult.failed > 0 
                      ? 'bg-orange-50 border-orange-200 text-orange-900' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    {bulkWatiResult.wasStopped ? (
                      <AlertTriangle size={36} className="text-amber-600 mx-auto" />
                    ) : bulkWatiResult.failed > 0 ? (
                      <ShieldAlert size={36} className="text-orange-600 mx-auto" />
                    ) : (
                      <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
                    )}

                    <h4 className="font-bold text-lg">
                      {bulkWatiResult.wasStopped 
                        ? 'Envío Detenido por el Usuario' 
                        : bulkWatiResult.failed > 0 
                        ? 'Envío Finalizado con Observaciones' 
                        : '¡Envío Masivo Completado con Éxito!'}
                    </h4>

                    <p className="text-xs">
                      Se enviaron <strong>{bulkWatiResult.sent}</strong> de <strong>{bulkWatiResult.total}</strong> mensajes por WhatsApp WATI.
                    </p>

                    {bulkWatiResult.wasStopped && (
                      <p className="text-xs text-amber-800 font-semibold">
                        El proceso se detuvo de forma segura. Los invitados restantes pueden enviarse en el siguiente lote.
                      </p>
                    )}
                  </div>

                  {/* Listado de Fallos si existen */}
                  {bulkWatiResult.failedList && bulkWatiResult.failedList.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                        <AlertCircle size={15} />
                        <span>Números que no pudieron ser entregados ({bulkWatiResult.failedList.length}):</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {bulkWatiResult.failedList.map((f, idx) => (
                          <div key={idx} className="bg-white/80 p-2 rounded-lg text-[11px] border border-red-100 flex justify-between items-center">
                            <div>
                              <strong className="text-red-950">{f.name}</strong> • <span className="font-mono text-slate-700">{f.phone}</span> {f.company ? `(${f.company})` : ''}
                            </div>
                            <span className="text-[10px] text-red-600 font-medium">{f.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Resumen y Diagnóstico de Contactos de WATI */}
                  {(() => {
                    const targetSp = bulkWatiModal.sponsorName;
                    const availableInvites = invites.filter(inv => {
                      if (targetSp === 'general') {
                        if (inv.sponsorName && inv.sponsorId !== 'general' && getSponsorKey(inv.sponsorName) !== 'general') return false;
                      } else if (targetSp !== 'all') {
                        if (!isMatchingSponsor(inv.sponsorName, targetSp) && inv.sponsorId !== getSponsorKey(targetSp)) return false;
                      }
                      return true;
                    });

                    const pendingTotal = availableInvites.filter(i => i.status === 'pending');
                    
                    const withValidPhone = pendingTotal.filter(i => cleanPhoneNumber(i.telefono).isValid);
                    const withoutPhone = pendingTotal.filter(i => !cleanPhoneNumber(i.telefono).isValid);

                    const neverSent = withValidPhone.filter(i => !i.whatsappSent && !i.whatsappSentAt);
                    const alreadySent = withValidPhone.filter(i => i.whatsappSent || i.whatsappSentAt);

                    const currentFilterTargets = bulkWatiModal.filterType === 'never_sent' 
                      ? neverSent 
                      : withValidPhone;
                    
                    const batchSize = bulkWatiModal.batchLimit === 'all' 
                      ? currentFilterTargets.length 
                      : Math.min(parseInt(bulkWatiModal.batchLimit, 10) || currentFilterTargets.length, currentFilterTargets.length);

                    const delayMs = bulkWatiModal.paceSpeed === 'safe' ? 1000 : 600;
                    const estimatedSeconds = Math.ceil((batchSize * (delayMs + 100)) / 1000);

                    return (
                      <div className="space-y-4">
                        
                        {/* Estado de la Plantilla en WATI / Meta */}
                        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                              <Zap size={14} className="text-emerald-700 fill-emerald-700" />
                              Plantilla Oficial: <code className="font-mono text-emerald-800 bg-emerald-100/70 px-1 py-0.5 rounded">invitacion_expoferre</code>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              watiTemplateInfo?.status === 'APPROVED' 
                                ? 'bg-emerald-200 text-emerald-900 border border-emerald-400' 
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                              {watiTemplateInfo?.status === 'APPROVED' ? '✅ Aprobada por Meta' : '⏳ En revisión Meta (PENDING)'}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            Cada mensaje se despachará de forma individual a cada invitado, inyectando su nombre, patrocinador anfitrión y su token único criptográfico de acceso.
                          </p>
                        </div>

                        {/* Desglose de Diagnóstico */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl">
                            <span className="text-secondary block text-[10px] uppercase font-bold">Listos (Primer Envío)</span>
                            <span className="text-xl font-black text-blue-900">{neverSent.length}</span>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                            <span className="text-secondary block text-[10px] uppercase font-bold">Ya Enviados</span>
                            <span className="text-xl font-black text-emerald-900">{alreadySent.length}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                            <span className="text-secondary block text-[10px] uppercase font-bold">Sin Teléfono</span>
                            <span className="text-xl font-black text-slate-500">{withoutPhone.length}</span>
                          </div>
                        </div>

                        {/* Selector de Criterio de Envío */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                            Criterio de Selección:
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                              bulkWatiModal.filterType === 'never_sent' ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 font-medium' : 'bg-surface border-outline-variant hover:bg-surface-variant/30 text-secondary'
                            }`}>
                              <input
                                type="radio"
                                name="watiFilterType"
                                value="never_sent"
                                checked={bulkWatiModal.filterType === 'never_sent'}
                                onChange={() => setBulkWatiModal(prev => ({ ...prev, filterType: 'never_sent' }))}
                                className="mt-0.5 accent-emerald-600"
                              />
                              <div className="text-xs">
                                <strong className="block text-on-surface">Solo Nunca Enviados ({neverSent.length})</strong>
                                <span className="text-[11px] text-secondary">Ideal para el primer lanzamiento sin duplicados.</span>
                              </div>
                            </label>

                            <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                              bulkWatiModal.filterType === 'all_pending' ? 'bg-blue-50/70 border-blue-500 text-blue-950 font-medium' : 'bg-surface border-outline-variant hover:bg-surface-variant/30 text-secondary'
                            }`}>
                              <input
                                type="radio"
                                name="watiFilterType"
                                value="all_pending"
                                checked={bulkWatiModal.filterType === 'all_pending'}
                                onChange={() => setBulkWatiModal(prev => ({ ...prev, filterType: 'all_pending' }))}
                                className="mt-0.5 accent-emerald-600"
                              />
                              <div className="text-xs">
                                <strong className="block text-on-surface">Todos con Teléfono ({withValidPhone.length})</strong>
                                <span className="text-[11px] text-secondary">Incluye reenvíos a quienes no se han registrado.</span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Selector de Lote / Tamaño */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-on-surface uppercase tracking-wider">Cantidad a Despachar:</span>
                            <span className="text-secondary font-mono">
                              Objetivos disponibles: <strong>{currentFilterTargets.length}</strong>
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { id: '10', label: '10 msgs' },
                              { id: '25', label: '25 msgs' },
                              { id: '50', label: '50 msgs' },
                              { id: 'all', label: `Todos (${currentFilterTargets.length})` }
                            ].map(opt => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setBulkWatiModal(prev => ({ ...prev, batchLimit: opt.id }))}
                                className={`py-2 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                  bulkWatiModal.batchLimit === opt.id
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-white border-outline-variant hover:bg-surface-variant/30 text-on-surface'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Velocidad / Intervalo de Entrega Antispam */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center justify-between">
                            <span>Intervalo de Envío (Protección Antispam Meta):</span>
                            <span className="text-[11px] font-normal text-secondary">Tiempo estimado: ~{estimatedSeconds}s</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'safe', label: '🛡️ Seguro (1.0 seg)', desc: 'Recomendado por Meta' },
                              { id: 'normal', label: '⚡ Normal (0.6 seg)', desc: 'Lotes medianos' }
                            ].map(spd => (
                              <button
                                key={spd.id}
                                type="button"
                                onClick={() => setBulkWatiModal(prev => ({ ...prev, paceSpeed: spd.id }))}
                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                  bulkWatiModal.paceSpeed === spd.id
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm'
                                    : 'bg-white border-outline-variant hover:bg-surface-variant/30 text-secondary'
                                }`}
                              >
                                <span className="block text-[11px] font-bold text-on-surface">{spd.label}</span>
                                <span className="block text-[9px] text-secondary">{spd.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Barra de Progreso en Vivo */}
                        {isBulkSendingWati && (
                          <div className="space-y-2 pt-2 bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                            <div className="flex justify-between text-xs font-bold text-on-surface">
                              <span className="flex items-center gap-1.5 text-emerald-800">
                                <RefreshCw size={13} className="animate-spin text-emerald-600" />
                                Despachando WhatsApp por WATI ({bulkWatiProgress.current} de {bulkWatiProgress.total})...
                              </span>
                              <span className="text-emerald-900 font-black">
                                {Math.round((bulkWatiProgress.current / (bulkWatiProgress.total || 1)) * 100)}%
                              </span>
                            </div>

                            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full transition-all duration-150"
                                style={{ width: `${(bulkWatiProgress.current / (bulkWatiProgress.total || 1)) * 100}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-emerald-900 pt-1">
                              <span>Fallidos: <strong>{bulkWatiProgress.failed}</strong></span>
                              <button
                                type="button"
                                onClick={handleStopBulkWati}
                                className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow"
                              >
                                <StopCircle size={13} />
                                Detener Envío
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })()}
                </>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-variant/30 border-t border-outline-variant flex items-center justify-end gap-3 shrink-0">
              {bulkWatiResult ? (
                <button
                  type="button"
                  onClick={() => {
                    setBulkWatiModal({ open: false, sponsorName: 'general', sponsorDisplayName: '', filterType: 'never_sent', batchLimit: 'all', paceSpeed: 'safe' });
                    setBulkWatiResult(null);
                  }}
                  className="py-2.5 px-6 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-black transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isBulkSendingWati}
                    onClick={() => setBulkWatiModal({ open: false, sponsorName: 'general', sponsorDisplayName: '', filterType: 'never_sent', batchLimit: 'all', paceSpeed: 'safe' })}
                    className="py-2.5 px-4 bg-white border border-outline-variant hover:bg-surface text-on-surface font-bold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isBulkSendingWati}
                    onClick={handleExecuteBulkWati}
                    className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Zap size={16} />
                    {isBulkSendingWati
                      ? `Enviando (${bulkWatiProgress.current}/${bulkWatiProgress.total})...`
                      : 'Iniciar Envío Masivo Wati'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification para WATI */}
      {watiNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-600 animate-in fade-in slide-in-from-bottom duration-300">
          <CheckCircle2 size={20} className="text-emerald-300 shrink-0" />
          <span className="text-xs font-bold">{watiNotification.message}</span>
        </div>
      )}

      {qrModalOpen && selectedPersonForQR && (
        <AdminQRViewModal
          isOpen={qrModalOpen}
          onClose={() => {
            setQrModalOpen(false);
            setSelectedPersonForQR(null);
          }}
          person={selectedPersonForQR}
          roleLabel="Invitado Registrado"
        />
      )}

    </div>
  );
}
