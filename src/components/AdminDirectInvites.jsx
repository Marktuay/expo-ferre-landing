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
  CheckSquare
} from 'lucide-react';

export default function AdminDirectInvites({ onBack, adminUser }) {
  const [invites, setInvites] = useState([]);
  const [standsData, setStandsData] = useState([]);
  const [sponsorsMap, setSponsorsMap] = useState({});
  const [sponsorSettings, setSponsorSettings] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Filtros
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
  const [artStands, setArtStands] = useState('');
  const [artCustomSpeech, setArtCustomSpeech] = useState('');
  const [artCustomSubject, setArtCustomSubject] = useState('');
  const [isUploadingHeader, setIsUploadingHeader] = useState(false);
  const [isUploadingFooter, setIsUploadingFooter] = useState(false);
  const [isSavingArt, setIsSavingArt] = useState(false);
  const [artTab, setArtTab] = useState('banners'); // 'banners' | 'speech' | 'preview'

  // Modal para Carga Masiva (Excel)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState([]);
  const [bulkTargetSponsor, setBulkTargetSponsor] = useState('auto');
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);

  // Modal para Enviar Correo Directo
  const [emailModal, setEmailModal] = useState({ open: false, invite: null });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

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
        
        const comp = (s.company || s.reservationDetails?.empresa || '').trim();
        if (comp && (s.status === 'reserved' || s.status === 'sold' || s.reservedBy)) {
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
    return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  };

  const getSponsorArt = (sponsorName) => {
    const key = getSponsorKey(sponsorName);
    const setting = sponsorSettings[key] || {};
    return {
      headerBannerUrl: setting.headerBannerUrl || 'https://expoferrenicaragua.com/email-header.png',
      footerBannerUrl: setting.footerBannerUrl || 'https://expoferrenicaragua.com/email-footer.png',
      customSpeech: setting.customSpeech || '',
      stands: setting.stands || (sponsorsMap[sponsorName]?.stands?.join(', ') || '')
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

  // Abrir Modal de Configuración de Artes por Patrocinador
  const handleOpenArtModal = (sponsorName) => {
    const key = getSponsorKey(sponsorName);
    const existing = sponsorSettings[key] || {};
    const defaultStands = sponsorsMap[sponsorName]?.stands?.join(', ') || '';

    setArtModal({
      open: true,
      sponsorKey: key,
      sponsorName: sponsorName === 'general' ? 'Invitación General (ExpoFerre)' : sponsorName,
      stands: defaultStands
    });

    setArtHeaderUrl(existing.headerBannerUrl || (sponsorName === 'general' ? 'https://expoferrenicaragua.com/email-header.png' : ''));
    setArtFooterUrl(existing.footerBannerUrl || (sponsorName === 'general' ? 'https://expoferrenicaragua.com/email-footer.png' : ''));
    setArtStands(existing.stands || defaultStands);
    setArtCustomSpeech(existing.customSpeech || '');
    setArtCustomSubject(existing.customEmailSubject || '');
    setArtTab('banners');
  };

  // Subir imagen de banner a Firebase Storage
  const handleUploadBannerImage = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'header') setIsUploadingHeader(true);
    if (type === 'footer') setIsUploadingFooter(true);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `events/2026/sponsorBanners/${artModal.sponsorKey}_${type}_${Date.now()}.${fileExt}`;
      const imgRef = storageRef(storage, fileName);

      await uploadBytes(imgRef, file);
      const downloadUrl = await getDownloadURL(imgRef);

      if (type === 'header') setArtHeaderUrl(downloadUrl);
      if (type === 'footer') setArtFooterUrl(downloadUrl);
    } catch (err) {
      console.error('Error al subir imagen de banner:', err);
      alert('Error al subir imagen: ' + err.message);
    } finally {
      if (type === 'header') setIsUploadingHeader(false);
      if (type === 'footer') setIsUploadingFooter(false);
    }
  };

  // Guardar configuración de artes
  const handleSaveSponsorArt = async () => {
    setIsSavingArt(true);
    try {
      const settingRef = doc(db, `${getEventBasePath()}/sponsorSettings`, artModal.sponsorKey);
      await setDoc(settingRef, {
        sponsorId: artModal.sponsorKey,
        sponsorName: artModal.sponsorName,
        headerBannerUrl: artHeaderUrl.trim() || null,
        footerBannerUrl: artFooterUrl.trim() || null,
        stands: artStands.trim() || null,
        customSpeech: artCustomSpeech.trim() || null,
        customEmailSubject: artCustomSubject.trim() || null,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser?.email || auth.currentUser?.email || 'admin'
      }, { merge: true });

      setArtModal({ open: false, sponsorKey: '', sponsorName: '', stands: '' });
      alert(`¡Artes y configuración de "${artModal.sponsorName}" guardados exitosamente!`);
    } catch (err) {
      console.error('Error al guardar artes de patrocinador:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setIsSavingArt(false);
    }
  };

  // Descargar Plantilla Oficial de Excel
  const handleDownloadTemplate = () => {
    import('xlsx').then((XLSX) => {
      const targetSponsorName = selectedSponsorFilter !== 'all' && selectedSponsorFilter !== 'general' ? selectedSponsorFilter : 'SINSA';
      const templateData = [
        {
          Nombre: "Carlos Mendoza",
          Empresa: "Ferretería El Roble",
          Correo: "carlos@ejemplo.com",
          Telefono: "88887777",
          Patrocinador: targetSponsorName
        },
        {
          Nombre: "María Silva",
          Empresa: "Distribuidora Central",
          Correo: "maria@ejemplo.com",
          Telefono: "87654321",
          Patrocinador: targetSponsorName
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
      XLSX.writeFile(workbook, `Plantilla_Carga_Masiva_${targetSponsorName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    });
  };

  // Procesar archivo Excel/CSV subido
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawData || rawData.length === 0) {
          alert('El archivo Excel está vacío o no tiene un formato válido.');
          return;
        }

        const parsedRows = rawData.map((row, index) => {
          const keys = Object.keys(row);
          const findVal = (candidates) => {
            const match = keys.find(k => candidates.some(c => k.toLowerCase().trim().includes(c)));
            return match ? String(row[match]).trim() : '';
          };

          const nombre = findVal(['nombre', 'name', 'invitado', 'contacto', 'persona']);
          const empresa = findVal(['empresa', 'company', 'negocio', 'ferreteria']);
          const correo = findVal(['correo', 'email', 'mail', 'e-mail']);
          const telefono = findVal(['telefono', 'teléfono', 'celular', 'phone', 'movil', 'móvil', 'tel']);
          const patrocinador = findVal(['patrocinador', 'sponsor', 'anfitrion', 'marca']);

          return {
            rowNum: index + 2,
            nombre,
            empresa,
            email: correo.toLowerCase(),
            telefono,
            patrocinador: patrocinador || (selectedSponsorFilter !== 'all' && selectedSponsorFilter !== 'general' ? selectedSponsorFilter : '')
          };
        }).filter(r => r.nombre || r.empresa || r.email || r.telefono);

        if (parsedRows.length === 0) {
          alert('No se detectaron contactos con datos válidos en el archivo.');
          return;
        }

        setBulkData(parsedRows);
        setBulkTargetSponsor(selectedSponsorFilter !== 'all' ? selectedSponsorFilter : 'auto');
        setShowBulkModal(true);
      } catch (err) {
        console.error('Error al procesar archivo Excel:', err);
        alert('Error al leer el archivo Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  // Guardar Lote de Invitaciones Directas en Firestore
  const handleConfirmBulkUpload = async () => {
    if (!bulkData || bulkData.length === 0) return;
    setIsBulkSaving(true);
    setBulkProgress({ current: 0, total: bulkData.length });

    try {
      const adminEmail = adminUser?.email || auth.currentUser?.email || 'admin';
      const total = bulkData.length;
      const chunkSize = 400;

      for (let i = 0; i < total; i += chunkSize) {
        const chunk = bulkData.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          const tokenId = generateUniqueToken();
          const inviteRef = doc(db, `${getEventBasePath()}/directInvites`, tokenId);
          
          let spName = null;
          if (bulkTargetSponsor && bulkTargetSponsor !== 'auto') {
            spName = bulkTargetSponsor === 'general' ? null : bulkTargetSponsor;
          } else if (item.patrocinador && item.patrocinador.toLowerCase() !== 'general') {
            // Match with sponsorsMap
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
        setBulkProgress({ current: Math.min(i + chunkSize, total), total });
      }

      setShowBulkModal(false);
      setBulkData([]);
      alert(`¡Éxito! Se generaron correctamente ${total} invitaciones directas con enlaces únicos.`);
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
    const baseUrl = window.location.origin;
    return `${baseUrl}/?invite=${encodeURIComponent(token)}`;
  };

  // Obtener speech dinámico personalizado
  const getWhatsAppSpeech = (invite) => {
    const link = getInviteUrl(invite.id);
    const guestLabel = invite.nombre?.trim() || 'Estimado(a) Colega';
    const sponsorName = invite.sponsorName || '';
    const art = sponsorName ? getSponsorArt(sponsorName) : getSponsorArt('general');
    const stands = invite.sponsorStands || art.stands || '';

    if (art.customSpeech && art.customSpeech.trim()) {
      return art.customSpeech
        .replace(/{invitado}/g, guestLabel)
        .replace(/{empresa_invitada}/g, invite.empresa || '')
        .replace(/{patrocinador}/g, sponsorName)
        .replace(/{stands}/g, stands ? `Stand ${stands}` : 'nuestro stand')
        .replace(/{enlace}/g, link);
    }

    if (sponsorName) {
      return `¡Hola ${guestLabel}! 👋 Te saludamos en nombre de ${sponsorName} y el comité organizador de EXPO FERRE Nicaragua 2026.

Tenemos el agrado de extenderte una invitación especial y exclusiva para que nos acompañes y nos visites en nuestro ${stands ? `Stand ${stands}` : 'stand oficial'}.

📅 Fecha: 16 y 17 de Octubre de 2026
📍 Lugar: Centro de Convenciones Crowne Plaza, Managua

Hemos reservado para ti un pase preferencial. Para activar tu acceso y recibir tu Gafete Oficial con Código QR, por favor completa tu registro en el siguiente enlace único:

🔗 ${link}

⚠️ Nota: Este enlace es personal, intransferible y de un solo uso. Una vez completado tu registro, el enlace se desactivará automáticamente.

¡Será un verdadero honor recibirte en nuestro stand! 🚀`;
    }

    // General Speech (Karen Torres)
    return `¡Hola ${guestLabel}! Te saluda Karen Torres en nombre del comité organizador de EXPO FERRE Nicaragua 2026.

Es un gusto saludarte y extenderte una invitación especial y personalizada para ser parte del encuentro más importante de la industria ferretera y de la construcción en el país.

📅 Fecha: 16 y 17 de Octubre de 2026
📍 Lugar: Centro de Convenciones Crowne Plaza, Managua

Hemos reservado para ti un pase exclusivo. Para activar tu acceso y recibir tu Gafete Oficial con Código QR, por favor completa tu registro en el siguiente enlace único:

🔗 ${link}

⚠️ Nota: Este enlace es personal, intransferible y de un solo uso. Una vez completado tu registro, el enlace se desactivará automáticamente.

¡Será un verdadero honor contar con tu presencia! 🚀`;
  };

  const getWhatsAppUrl = (invite) => {
    const text = encodeURIComponent(getWhatsAppSpeech(invite));
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

  const handleCopyLinkOnly = (invite) => {
    const link = getInviteUrl(invite.id);
    navigator.clipboard.writeText(link);
    setCopiedToken(`link_${invite.id}`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Enviar correo individual
  const handleSendEmailDirect = async (e) => {
    e.preventDefault();
    const invite = emailModal.invite;
    if (!invite || !invite.targetEmail?.trim()) return;

    setIsSendingEmail(true);
    setEmailSuccess('');

    try {
      const link = getInviteUrl(invite.id);
      const guestLabel = invite.nombre?.trim() || 'Estimado(a) Invitado(a)';
      const sponsorName = invite.sponsorName || '';
      const art = sponsorName ? getSponsorArt(sponsorName) : getSponsorArt('general');
      const stands = invite.sponsorStands || art.stands || '';

      const subject = art.customEmailSubject || (sponsorName 
        ? `Invitación Exclusiva por cortesía de ${sponsorName} - EXPO FERRE 2026`
        : 'Invitación Exclusiva: Acceso Oficial a EXPO FERRE Nicaragua 2026');

      await addDoc(collection(db, 'mail'), {
        to: invite.targetEmail.trim(),
        message: {
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
              <img src="${art.headerBannerUrl}" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 32px 24px;">
                <h2 style="color: #0d47a1; margin-top: 0; font-size: 22px;">¡Hola ${guestLabel}!</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
                  ${sponsorName 
                    ? `Te saludamos cordialmente en nombre de <strong>${sponsorName}</strong> y el comité organizador de <strong>EXPO FERRE Nicaragua 2026</strong>.`
                    : 'Te saluda <strong>Karen Torres</strong> en nombre del comité organizador de <strong>EXPO FERRE Nicaragua 2026</strong>.'}
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
                  ${sponsorName && stands 
                    ? `Tenemos el agrado de invitarte de forma exclusiva para que nos acompañes y conozcas nuestras últimas innovaciones en el <strong>Stand ${stands}</strong>.`
                    : 'Es un gusto saludarte y extenderte una invitación especial y personalizada para ser parte del encuentro más importante de la industria ferretera y de la construcción en el país.'}
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
                  Hemos reservado para ti un <strong>pase preferencial de acceso</strong>. Para activar tu acceso y recibir tu Gafete Oficial con Código QR, por favor completa tu registro ingresando al botón que encontrarás abajo:
                </p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${link}" style="background-color: #f39200; color: #ffffff; padding: 15px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    🎟️ Activar Mi Pase Exclusivo
                  </a>
                </div>

                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 4px; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 13px; color: #92400e;">
                    ⚠️ <strong>Nota:</strong> Este enlace es personal, intransferible y de <strong>un solo uso</strong>. Una vez completado tu registro, el enlace se desactivará automáticamente.
                  </p>
                </div>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; text-align: left;">
                  <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📅 <strong>Fecha:</strong> 16 y 17 de Octubre, 2026</p>
                  <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📍 <strong>Lugar:</strong> Centro de Convenciones Crowne Plaza, Managua.</p>
                  ${sponsorName && stands ? `<p style="margin: 4px 0; font-size: 13px; color: #d97706;">🏢 <strong>Stand Anfitrión:</strong> Stand ${stands} (${sponsorName})</p>` : ''}
                </div>

                <p style="font-size: 15px; font-weight: bold; color: #0d47a1; margin-top: 28px;">
                  ¡Será un verdadero honor contar con tu presencia! 🚀
                </p>

                <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; word-break: break-all;">
                  Si el botón no abre, copia y pega este enlace en tu navegador:<br/>
                  <a href="${link}" style="color: #0d47a1;">${link}</a>
                </p>
              </div>
              
              <img src="${art.footerBannerUrl}" alt="Marcas ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
          `
        }
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

  // Exportar Excel (Respeta el filtro de lista de patrocinador)
  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const dataToExport = filteredInvites.map((inv) => ({
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
        Fecha_Uso: inv.usedAt ? inv.usedAt.toLocaleDateString() + ' ' + inv.usedAt.toLocaleTimeString() : '',
        Enlace_Unico: getInviteUrl(inv.id)
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      const sheetName = selectedSponsorFilter !== 'all' ? selectedSponsorFilter.substring(0, 30) : 'Invitaciones_Directas';
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `Invitaciones_${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}_ExpoFerre_2026.xlsx`);
    });
  };

  // Filtrar Invitaciones
  const filteredInvites = invites.filter(inv => {
    const term = searchTerm.toLowerCase().trim();
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    let matchesSponsor = true;
    if (selectedSponsorFilter === 'general') {
      matchesSponsor = !inv.sponsorName || inv.sponsorId === 'general';
    } else if (selectedSponsorFilter !== 'all') {
      matchesSponsor = (inv.sponsorName || '').toLowerCase() === selectedSponsorFilter.toLowerCase();
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

  // Métricas generales y filtradas
  const totalCount = filteredInvites.length;
  const pendingCount = filteredInvites.filter(i => i.status === 'pending').length;
  const usedCount = filteredInvites.filter(i => i.status === 'used').length;

  const sponsorsList = Object.keys(sponsorsMap).sort();

  // Datos del patrocinador actualmente seleccionado
  const currentSponsorArt = selectedSponsorFilter !== 'all' ? getSponsorArt(selectedSponsorFilter) : null;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Principal */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-outline-variant shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck size={14} />
              Acceso Exclusivo de Un Solo Uso
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-on-surface">
              Invitaciones Directas & Listas por Patrocinador
            </h1>
            <p className="text-secondary text-sm">
              Administra listas independientes para cada marca, configura sus artes de Header y Footer, y comparte enlaces de un solo uso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            <button
              onClick={() => {
                setGuestSponsor(selectedSponsorFilter !== 'all' ? selectedSponsorFilter : 'general');
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-2 text-xs shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              Nuevo Invitado
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 text-xs shadow-sm cursor-pointer"
            >
              <FileUp size={16} />
              Cargar Excel
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-2.5 bg-white border border-outline-variant text-secondary rounded-xl font-bold hover:bg-surface-variant transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-2xs"
              title="Descargar plantilla de Excel"
            >
              <Download size={15} />
              Plantilla
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredInvites.length === 0}
              className="px-3.5 py-2.5 bg-[#217346] text-white rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-1.5 text-xs shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet size={15} />
              Exportar Lista
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

        {/* SELECTOR DE LISTAS INDEPENDIENTES (TABS / PILLS) */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline-variant/60 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-on-surface uppercase tracking-wider">
              <Layers size={16} className="text-primary" />
              <span>Listas Independientes ({sponsorsList.length + 2}):</span>
            </div>
            <span className="text-xs text-secondary">
              Selecciona una lista para ver sus invitados, métricas y artes asignados.
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedSponsorFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedSponsorFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                  : 'bg-surface hover:bg-surface-variant text-secondary'
              }`}
            >
              <span>🌐 Todas las Listas</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">{invites.length}</span>
            </button>

            <button
              onClick={() => setSelectedSponsorFilter('general')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedSponsorFilter === 'general'
                  ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/30'
                  : 'bg-surface hover:bg-surface-variant text-secondary'
              }`}
            >
              <span>⭐ Invitación General (ExpoFerre)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
                {invites.filter(i => !i.sponsorName || i.sponsorId === 'general').length}
              </span>
            </button>

            {sponsorsList.map((sp) => {
              const count = invites.filter(i => (i.sponsorName || '').toLowerCase() === sp.toLowerCase()).length;
              const isSelected = selectedSponsorFilter.toLowerCase() === sp.toLowerCase();
              return (
                <button
                  key={sp}
                  onClick={() => setSelectedSponsorFilter(sp)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-sm ring-2 ring-primary/30'
                      : 'bg-surface hover:bg-surface-variant text-on-surface'
                  }`}
                >
                  <span>🏢 {sp}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TARJETA DE GESTIÓN DE ARTES DEL PATROCINADOR SELECCIONADO */}
        {selectedSponsorFilter !== 'all' && (
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-2xl text-white shadow-md border border-blue-800/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider text-amber-300">
                  {selectedSponsorFilter === 'general' ? 'Lista General' : `Patrocinador: ${selectedSponsorFilter}`}
                </span>
                {currentSponsorArt?.stands && (
                  <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs font-medium text-slate-200">
                    📍 Stand(s): {currentSponsorArt.stands}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold">
                {selectedSponsorFilter === 'general' ? 'Artes Oficiales de Expo Ferre 2026' : `Artes y Co-Branding de ${selectedSponsorFilter}`}
              </h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Los correos y pantallas de registro de esta lista mostrarán el <strong>Header Banner</strong> superior y la <strong>Cinta de Marcas (Footer)</strong> inferior configurados.
              </p>
            </div>

            {/* Vistas previas de artes */}
            <div className="flex flex-wrap items-center gap-4 bg-black/30 p-3.5 rounded-xl border border-white/10">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Header (1200x450)</p>
                <div className="w-28 h-14 bg-slate-800 rounded-lg overflow-hidden border border-white/20 flex items-center justify-center">
                  {currentSponsorArt?.headerBannerUrl ? (
                    <img src={currentSponsorArt.headerBannerUrl} alt="Header" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-400">Sin Arte</span>
                  )}
                </div>
              </div>

              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Footer Marcas (1200x250)</p>
                <div className="w-28 h-14 bg-slate-800 rounded-lg overflow-hidden border border-white/20 flex items-center justify-center">
                  {currentSponsorArt?.footerBannerUrl ? (
                    <img src={currentSponsorArt.footerBannerUrl} alt="Footer" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-400">Sin Arte</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleOpenArtModal(selectedSponsorFilter)}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Palette size={16} />
                Configurar Artes & Speech
              </button>
            </div>
          </div>
        )}

        {/* Tarjetas de Métricas de la Lista */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Send size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">
                Total Enlaces {selectedSponsorFilter !== 'all' ? `(${selectedSponsorFilter})` : ''}
              </p>
              <p className="text-2xl font-black text-on-surface">{totalCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">Pendientes (Disponibles)</p>
              <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">Registrados (Gafete Emitido)</p>
              <p className="text-2xl font-black text-green-600">{usedCount}</p>
            </div>
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
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-surface text-secondary hover:bg-surface-variant'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('used')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === 'used' ? 'bg-green-600 text-white' : 'bg-surface text-secondary hover:bg-surface-variant'
              }`}
            >
              Registrados ({usedCount})
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
                  <th className="p-4 font-bold">Lista / Patrocinador</th>
                  <th className="p-4 font-bold">Estado del Enlace</th>
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
                      {searchTerm ? 'No se encontraron contactos con ese término de búsqueda.' : 'No hay invitados en esta lista aún. Puedes presionar "Nuevo Invitado" o "Cargar Excel" para comenzar.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvites.map((inv) => {
                    const isUsed = inv.status === 'used';
                    const link = getInviteUrl(inv.id);
                    const isWaCopied = copiedToken === `wa_${inv.id}`;
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

                        {/* Estado */}
                        <td className="p-4">
                          {isUsed ? (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 font-bold px-2.5 py-1 rounded-full text-xs border border-green-200">
                              <CheckCircle2 size={12} /> USADO / REGISTRADO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-full text-xs border border-amber-200">
                              <Clock size={12} /> DISPONIBLE (UN SOLO USO)
                            </span>
                          )}
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
                            
                            {/* Editar Invitado */}
                            <button
                              onClick={() => handleOpenEditGuest(inv)}
                              title="Editar datos del invitado o cambiar lista"
                              className="p-2 bg-white border border-outline-variant hover:bg-surface text-secondary hover:text-primary rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* WhatsApp Directo */}
                            <a
                              href={getWhatsAppUrl(inv)}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir chat de WhatsApp con el speech oficial y enlace único"
                              className="p-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shadow-2xs"
                            >
                              <Phone size={14} />
                              <span className="hidden xl:inline">WhatsApp</span>
                            </a>

                            {/* Copiar Speech WhatsApp */}
                            <button
                              onClick={() => handleCopyWhatsApp(inv)}
                              title="Copiar texto de WhatsApp al portapapeles"
                              className={`p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                isWaCopied ? 'bg-green-600 text-white' : 'bg-surface hover:bg-surface-variant text-on-surface border border-outline-variant'
                              }`}
                            >
                              {isWaCopied ? <Check size={14} /> : <Copy size={14} />}
                            </button>

                            {/* Enviar Correo */}
                            <button
                              onClick={() => setEmailModal({ open: true, invite: { ...inv, targetEmail: inv.email || '' } })}
                              title="Enviar correo de invitación con banner y enlace"
                              className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors cursor-pointer"
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
              <button onClick={() => setArtModal({ open: false, sponsorKey: '', sponsorName: '', stands: '' })} className="p-1 hover:bg-white/20 rounded-full text-white cursor-pointer">
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
                Banners (Header & Footer)
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
                          1. Header Banner Superior (1200 x 450 px)
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
                          className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-red-700"
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
                        2. Footer Banner de Marcas Representadas (1200 x 250 px)
                      </h4>
                      <p className="text-xs text-secondary">Cinta inferior con la parrilla de marcas que exhibirán en el stand</p>
                    </div>

                    {artFooterUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-outline-variant max-h-36 bg-slate-900">
                        <img src={artFooterUrl} alt="Footer Preview" className="w-full h-auto object-cover" />
                        <button
                          type="button"
                          onClick={() => setArtFooterUrl('')}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg text-xs font-bold shadow-md hover:bg-red-700"
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
                          className="px-2 py-1 bg-surface-variant hover:bg-primary/20 text-on-surface rounded-md text-[11px] font-mono font-bold"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {artTab === 'preview' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-xl text-xs flex items-center gap-2">
                    <Eye size={16} className="text-blue-600 shrink-0" />
                    <span>Así es como el invitado verá el correo de invitación y la pantalla web de registro.</span>
                  </div>

                  <div className="border border-outline-variant rounded-2xl overflow-hidden shadow-md max-w-lg mx-auto bg-white">
                    {/* Header Image */}
                    <img
                      src={artHeaderUrl || 'https://expoferrenicaragua.com/email-header.png'}
                      alt="Header Preview"
                      className="w-full h-auto object-cover"
                    />
                    
                    <div className="p-5 space-y-3 text-xs">
                      <h3 className="font-bold text-base text-[#0d47a1]">¡Hola Carlos Mendoza!</h3>
                      <p className="text-slate-600 leading-relaxed">
                        Te saludamos cordialmente en nombre de <strong>{artModal.sponsorName}</strong> y el comité organizador de <strong>EXPO FERRE Nicaragua 2026</strong>.
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        Tenemos el agrado de invitarte de forma exclusiva para que nos acompañes y conozcas nuestras últimas innovaciones en el <strong>Stand {artStands || 'Oficial'}</strong>.
                      </p>
                      
                      <div className="text-center py-4">
                        <span className="inline-block bg-[#f39200] text-white px-6 py-2.5 rounded-lg font-bold shadow-xs">
                          🎟️ Activar Mi Pase Exclusivo
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-[11px]">
                        <p>📅 <strong>Fecha:</strong> 16 y 17 de Octubre, 2026</p>
                        <p>📍 <strong>Lugar:</strong> Centro de Convenciones Crowne Plaza, Managua</p>
                        <p>🏢 <strong>Stand:</strong> Stand {artStands || 'Oficial'} ({artModal.sponsorName})</p>
                      </div>
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

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-variant/30 border-t border-outline-variant flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                disabled={isSavingArt}
                onClick={() => setArtModal({ open: false, sponsorKey: '', sponsorName: '', stands: '' })}
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
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              <div className="bg-blue-50 border border-blue-200 text-blue-950 p-4 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Users size={18} className="text-blue-600 shrink-0" />
                  <span>
                    Se detectaron <strong>{bulkData.length} contactos válidos</strong> en el archivo.
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-blue-950 shrink-0">Asignar a:</label>
                  <select
                    value={bulkTargetSponsor}
                    onChange={(e) => setBulkTargetSponsor(e.target.value)}
                    className="bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none"
                  >
                    <option value="auto">⚡ Detectar por columna 'Patrocinador'</option>
                    <option value="general">⭐ Invitación General (ExpoFerre)</option>
                    {sponsorsList.map(sp => (
                      <option key={sp} value={sp}>🏢 Lista de {sp}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tabla con scroll */}
              <div className="border border-outline-variant rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-surface-variant/70 sticky top-0 border-b border-outline-variant text-secondary">
                      <tr>
                        <th className="p-3 font-bold text-center w-12">#</th>
                        <th className="p-3 font-bold">Nombre</th>
                        <th className="p-3 font-bold">Empresa</th>
                        <th className="p-3 font-bold">Correo</th>
                        <th className="p-3 font-bold">Teléfono</th>
                        <th className="p-3 font-bold">Patrocinador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60">
                      {bulkData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-variant/20 transition-colors">
                          <td className="p-2.5 text-center font-mono text-secondary">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-on-surface">{item.nombre || <span className="text-slate-400 italic">Sin nombre</span>}</td>
                          <td className="p-2.5 text-on-surface">{item.empresa || <span className="text-slate-400 italic">Sin empresa</span>}</td>
                          <td className="p-2.5 font-mono text-slate-600">{item.email || <span className="text-slate-400 italic">Sin correo</span>}</td>
                          <td className="p-2.5 font-mono text-slate-600">{item.telefono || <span className="text-slate-400 italic">Sin teléfono</span>}</td>
                          <td className="p-2.5 font-bold text-slate-800">
                            {bulkTargetSponsor !== 'auto' ? (bulkTargetSponsor === 'general' ? 'General' : bulkTargetSponsor) : (item.patrocinador || 'General')}
                          </td>
                        </tr>
                      ))}
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

            {/* Footer */}
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
                disabled={isBulkSaving || bulkData.length === 0}
                onClick={handleConfirmBulkUpload}
                className="py-2.5 px-5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <FileUp size={16} />
                {isBulkSaving ? `Importando (${bulkProgress.current}/${bulkProgress.total})...` : `Generar ${bulkData.length} Invitaciones`}
              </button>
            </div>

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

    </div>
  );
}
