// Public, non-sensitive seed content ONLY. All wedding details are tentative.
// Real guest data, RSVPs, and photos must live behind Supabase RLS / signed URLs.
export const wedding = {
  couple: ['Никита', 'Кристина'],
  dateLabel: '17–19 июня 2027',
  time: '14:00',
  location: 'Марьино / Санкт-Петербург',
  tentative: true,
  // Replace these with approved public image paths; a cutout foreground makes the depth effect possible.
  heroPhotoUrl: null,
  heroSubjectUrl: null,
};
export const sampleGuests = [
  { id: 'primer', name: 'Гость — пример', city: 'Санкт-Петербург', relation: 'Друг семьи', about: 'Здесь гость сможет рассказать о себе, о знакомстве с парой и добавить свои фотографии.', isSample: true, photos: [] },
];
// Three-day wedding plan as given by the organizers. Do not invent timings for 18/19 June.
export const weddingDays = [
  {date:'2027-06-17',label:'17 июня',weekday:'Четверг',title:'Регистрация брака',time:'14:00',place:'Усадьба Марьино',description:'Регистрация в 14:00'},
  {date:'2027-06-18',label:'18 июня',weekday:'Пятница',title:'Программа уточняется',time:null,place:null,description:'Мероприятия и время не определены'},
  {date:'2027-06-19',label:'19 июня',weekday:'Суббота',title:'Торжественная часть',time:null,place:'Санкт-Петербург',description:'Место проведения выбирается, время уточняется'}
];
export const tentativeSchedule = [
  {date:'2027-06-17',time:'14:00',title:'Регистрация брака',place:'Усадьба Марьино',note:'Регистрация в 14:00.',tentative:false},
  {date:'2027-06-19',time:null,title:'Торжественная часть',place:'Санкт-Петербург',note:'Площадка и время ещё не определены.',tentative:true}
];
export const adminModules = [
  { id:'overview', label:'Обзор', icon:'▦', text:'Общий статус подготовки и ближайшие решения.' },
  { id:'guests', label:'Гости', icon:'◉', text:'Приглашения, RSVP, сопровождение, предпочтения, рассадка и профили.' },
  { id:'budget', label:'Бюджет', icon:'₽', text:'Плановые суммы, предоплаты, платежи и подтверждённые расходы.' },
  { id:'menu', label:'Меню и анкеты', icon:'☷', text:'Блюда, аллергены, варианты ответа и сроки.' },
  { id:'photos', label:'Фотографии', icon:'▧', text:'Единая гостевая фотогалерея: пара, регистрация, утверждённые места программы, Петербург, достопримечательности и развлечения.' },
  { id:'venues', label:'Площадки', icon:'⌂', text:'Место регистрации, банкетная площадка, договоры и логистика.' },
  { id:'schedule', label:'Программа', icon:'◷', text:'17–19 июня 2027: регистрация в Марьино и торжественная часть в Санкт-Петербурге.' },
  { id:'tasks', label:'Задачи', icon:'✓', text:'Ответственные, сроки и контроль готовности.' },
  { id:'settings', label:'Настройки', icon:'⚙', text:'Теги и часы отображения программы каждого дня.' },
];