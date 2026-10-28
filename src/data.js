// Public, non-sensitive seed content ONLY. All wedding details are tentative.
// Real guest data, RSVPs, and photos must live behind Supabase RLS / signed URLs.
export const wedding = {
  couple: ['Никита', 'Кристина'],
  dateLabel: '17 июня 2027',
  time: '14:00',
  location: 'Марьино',
  tentative: true,
};
export const sampleGuests = [
  { id: 'primer', name: 'Гость — пример', city: 'Санкт-Петербург', relation: 'Друг семьи', about: 'Здесь гость сможет рассказать о себе, о знакомстве с парой и добавить свои фотографии.', isSample: true, photos: [] },
];
export const tentativeSchedule = [
  { time:'14:00', title:'Регистрация брака', place:'Марьино', note:'Дата, время и место ещё уточняются.', tentative:true },
];
export const adminModules = [
  { id:'overview', label:'Обзор', icon:'▦', text:'Общий статус подготовки и ближайшие решения.' },
  { id:'guests', label:'Гости', icon:'◉', text:'Приглашения, RSVP, сопровождение, предпочтения, рассадка и профили.' },
  { id:'catering', label:'Кейтеринг', icon:'◈', text:'Все найденные компании, сравнение прайсов, меню, условий и предложений.' },
  { id:'vendors', label:'Подрядчики', icon:'✦', text:'Фото, видео, ведущий, музыка, декор, транспорт и прочее.' },
  { id:'budget', label:'Бюджет', icon:'₽', text:'Плановые суммы, предоплаты, платежи и подтверждённые расходы.' },
  { id:'venues', label:'Площадки', icon:'⌂', text:'Место регистрации, банкетная площадка, договоры и логистика.' },
  { id:'schedule', label:'Программа', icon:'◷', text:'План свадебного дня и отдельный список задач подготовки.' },
  { id:'tasks', label:'Задачи', icon:'✓', text:'Ответственные, сроки и контроль готовности.' },
  { id:'documents', label:'Документы', icon:'▤', text:'Договоры, счета, предложения и сметы.' },
];