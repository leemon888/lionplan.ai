// Sample data for the demo. Courses, times and workload ratings are made up.
// Replace with real directory data and in-app workload ratings.

const CURRENT=[
  {code:'COMS 3203',title:'Discrete Mathematics',mtg:[{d:'MW',s:'10:10',e:'11:25'}]},
  {code:'MATH 2010',title:'Linear Algebra',mtg:[{d:'TR',s:'10:10',e:'11:25'}]},
  {code:'COMS 3134',title:'Data Structures',mtg:[{d:'TR',s:'13:10',e:'14:25'}]},
  {code:'ECON 1105',title:'Principles of Economics',mtg:[{d:'MW',s:'14:40',e:'15:55'}]},
];

const COURSES=[
 {code:'COMS 4995',title:'Topics in CS: Programming Languages for Music',dept:'COMS',pts:3,mtg:[{d:'T',s:'16:10',e:'18:40'}],wl:4,n:9,counts:['tech'],f:{topics:1,size:18},tags:'music audio sound creative languages',prereq:'COMS 3157 or instructor permission'},
 {code:'COMS 4172',title:'Interaction Sketching',dept:'COMS',pts:3,mtg:[{d:'MW',s:'13:10',e:'14:25'}],wl:5,n:21,counts:['tech'],f:{size:40},tags:'design interfaces ui creative prototyping'},
 {code:'COMS 4115',title:'Data Systems for Small Teams',dept:'COMS',pts:3,mtg:[{d:'TR',s:'14:40',e:'15:55'}],wl:9,n:27,counts:['tech'],f:{size:90},tags:'databases systems data engineering',prereq:'COMS 3134'},
 {code:'COMS 4240',title:'Algorithms in Practice',dept:'COMS',pts:3,mtg:[{d:'MW',s:'11:40',e:'12:55'}],wl:10,n:33,counts:['tech'],f:{size:120},tags:'algorithms optimization theory',prereq:'COMS 3134 and COMS 3203'},
 {code:'COMS 4996',title:'Topics in CS: Civic Data Engineering',dept:'COMS',pts:3,mtg:[{d:'TR',s:'16:10',e:'17:25'}],wl:5,n:7,counts:['tech'],f:{topics:1,size:20},tags:'cities urban nyc data policy civic government',prereq:'COMS 3134 or instructor permission'},
 {code:'COMS 4705',title:'Applied Machine Learning Lab',dept:'COMS',pts:3,mtg:[{d:'F',s:'10:10',e:'12:40'}],wl:8,n:30,counts:['tech'],f:{size:60},tags:'ai ml machine learning models data',prereq:'COMS 3134 and linear algebra'},
 {code:'COMS 3410',title:'Computers and Society',dept:'COMS',pts:3,mtg:[{d:'W',s:'19:10',e:'21:40'}],wl:3,n:14,counts:['tech'],f:{size:45},tags:'ethics policy society ai history'},
 {code:'COMS 4560',title:'Game Design Studio',dept:'COMS',pts:3,mtg:[{d:'R',s:'19:10',e:'21:40'}],wl:6,n:12,counts:['tech'],f:{size:24},tags:'games game play design creative',prereq:'COMS 3157'},
 {code:'COMS 6998',title:'Seminar: Systems for Scientific Computing',dept:'COMS',pts:3,mtg:[{d:'F',s:'13:10',e:'15:00'}],wl:6,n:4,counts:['tech'],f:{grad:1,size:15},tags:'science physics data simulation systems',prereq:'Instructor permission'},
 {code:'COMS 4446',title:'Puzzle Programming',dept:'COMS',pts:3,mtg:[{d:'TR',s:'11:40',e:'12:55'}],wl:12,n:18,counts:['tech'],f:{size:30},tags:'games puzzles algorithms problem solving'},
 {code:'URBS 3550',title:'Mapping New York: Data and the City',dept:'URBS',pts:3,mtg:[{d:'TR',s:'16:10',e:'17:25'}],wl:4,n:16,counts:['nontech'],f:{cross:1,size:25},tags:'cities urban nyc maps mapping neighborhood data'},
 {code:'PLAN 4310',title:'Housing Policy in Practice',dept:'PLAN',pts:3,mtg:[{d:'W',s:'18:10',e:'20:00'}],wl:5,n:5,counts:['nontech'],f:{grad:1,size:16},tags:'housing cities urban policy nyc government',prereq:'Instructor permission'},
 {code:'HIST 3480',title:'A History of the Subway',dept:'HIST',pts:3,mtg:[{d:'M',s:'16:10',e:'18:00'}],wl:4,n:11,counts:['nontech'],f:{size:18},tags:'cities nyc transit subway history'},
 {code:'ANTH 3990',title:'Topics: Anthropology of Algorithms',dept:'ANTH',pts:3,mtg:[{d:'TR',s:'14:40',e:'15:55'}],wl:5,n:8,counts:['nontech'],f:{topics:1,size:15},tags:'ai algorithms society ethics culture'},
 {code:'MUSI 2020',title:'Listening to Electronic Music',dept:'MUSI',pts:3,mtg:[{d:'MW',s:'11:40',e:'12:55'}],wl:3,n:25,counts:['nontech'],f:{size:80},tags:'music audio sound electronic culture'},
 {code:'ARTH 3100',title:'The Architecture of Morningside Heights',dept:'ARTH',pts:3,mtg:[{d:'F',s:'10:10',e:'12:00'}],wl:3,n:6,counts:['nontech'],f:{newt:1,size:14},tags:'cities architecture nyc art neighborhood history'},
 {code:'PHIL 3701',title:'Philosophy of Probability',dept:'PHIL',pts:3,mtg:[{d:'TR',s:'11:40',e:'12:55'}],wl:6,n:10,counts:['nontech'],f:{size:22},tags:'probability math philosophy logic'},
 {code:'ECON 3265',title:'Money and Banking',dept:'ECON',pts:3,mtg:[{d:'TR',s:'13:10',e:'14:25'}],wl:7,n:40,counts:['nontech'],f:{size:110},tags:'finance money banking markets economics',prereq:'ECON 1105'},
 {code:'SOCI 3235',title:'Social Networks and Data',dept:'SOCI',pts:3,mtg:[{d:'MW',s:'16:10',e:'17:25'}],wl:5,n:13,counts:['nontech'],f:{cross:1,size:35},tags:'networks data society'},
 {code:'EESC 2100',title:'Climate and the City',dept:'EESC',pts:3,mtg:[{d:'TR',s:'16:10',e:'17:25'}],wl:null,n:0,counts:[],f:{newt:1,size:40},tags:'climate environment cities urban science sustainability'},
 {code:'THTR 1500',title:'Improvisation',dept:'THTR',pts:3,mtg:[{d:'F',s:'13:10',e:'15:00'}],wl:2,n:19,counts:['nontech'],f:{size:16},tags:'performance theater creative'},
 {code:'LING 3101',title:'Language and the Brain',dept:'LING',pts:3,mtg:[{d:'MW',s:'13:10',e:'14:25'}],wl:5,n:15,counts:['nontech'],f:{size:50},tags:'language linguistics brain cognitive ai'},
 {code:'ITAL 3333',title:'Food Cultures of Italy',dept:'ITAL',pts:3,mtg:[{d:'T',s:'18:10',e:'20:00'}],wl:3,n:9,counts:['nontech'],f:{size:15},tags:'food cuisine culture history'},
 {code:'ASTR 1404',title:'Stars and Telescopes',dept:'ASTR',pts:3,mtg:[{d:'R',s:'19:30',e:'21:30'}],wl:3,n:22,counts:[],f:{size:60},tags:'space astronomy stars telescopes physics science'},
 {code:'MATH 3007',title:'Complex Variables',dept:'MATH',pts:3,mtg:[{d:'MW',s:'11:40',e:'12:55'}],wl:7,n:26,counts:['math'],f:{size:70},tags:'math analysis complex',prereq:'Calculus IV'},
 {code:'MATH 3020',title:'Number Theory and Cryptography',dept:'MATH',pts:3,mtg:[{d:'TR',s:'14:40',e:'15:55'}],wl:6,n:17,counts:['math'],f:{size:45},tags:'math crypto security number theory',prereq:'MATH 2010 or instructor permission'},
 {code:'MATH 4990',title:'Topics: The Mathematics of Voting',dept:'MATH',pts:3,mtg:[{d:'F',s:'10:10',e:'12:00'}],wl:null,n:0,counts:['math'],f:{topics:1,newt:1,size:18},tags:'voting elections policy math government'},
 {code:'STAT 3105',title:'Applied Statistical Methods',dept:'STAT',pts:3,mtg:[{d:'MW',s:'16:10',e:'17:25'}],wl:6,n:31,counts:[],f:{size:90},tags:'statistics data probability'},
 {code:'IEOR 4615',title:'Behavioral Finance Lab',dept:'IEOR',pts:3,mtg:[{d:'W',s:'16:10',e:'18:40'}],wl:6,n:8,counts:['tech'],f:{cross:1,size:30},tags:'finance behavioral markets trading economics'},
 {code:'ENGL 3820',title:'Writing About Science',dept:'ENGL',pts:3,mtg:[{d:'M',s:'18:10',e:'20:00'}],wl:null,n:0,counts:['nontech'],f:{size:12},tags:'writing science creative'},
];

const BUCKETS=[
  {key:'tech',name:'Tech electives',need:2},
  {key:'nontech',name:'Nontech electives',need:1},
  {key:'math',name:'Math minor',need:1},
];
const COUNTNAME={tech:'tech elective',nontech:'nontech elective',math:'math minor course'};
