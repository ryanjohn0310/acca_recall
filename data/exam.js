/* ---------------------------------------------------------------
   Exam technique — the briefing, and a drill on the six traps.
   Every wrong option below carries a written note explaining why it
   was tempting. That is the part the ACCA Study Hub does not do.
   --------------------------------------------------------------- */

const TRAP_TYPES = {
  neg:  {name:"The negative stem",        tag:"NOT / EXCEPT",
         tip:"Three of the four options are correct statements. Your job is to find the odd one out, which feels backwards under time pressure. Read the stem twice and say the word NOT out loud in your head before you look at the options."},
  near: {name:"The near-miss definition", tag:"Right words, wrong order",
         tip:"Distractors are built by swapping two words in the real definition — efficiency for effectiveness, authority for accountability. If two options look almost identical, the difference between them is the whole question."},
  attr: {name:"Wrong name, right model",  tag:"Theorist mismatch",
         tip:"The model described is real and the name attached to it is real; they just do not belong together. Learn the author-model pairings as pairs, not as separate facts."},
  irr:  {name:"True but irrelevant",      tag:"True — but not the answer",
         tip:"An option can be a perfectly true statement about business and still not answer the question asked. Re-read the stem after you shortlist, and check the option answers that exact question."},
  opp:  {name:"The opposite pair",        tag:"Two options contradict",
         tip:"When two options directly contradict each other, one of them is very often the answer — they cannot both be wrong in the same way. Work out which of the pair is right and ignore the other two."},
  abs:  {name:"Absolutes",                tag:"always / never / all",
         tip:"Options containing always, never, all or must are more often wrong than right, because business rarely works in absolutes. Not automatically wrong — but they earn a second look."}
};

/* q = stem, o = options, a = index of the answer,
   w = per-option note (why that wrong option is tempting; "" for the answer),
   why = the lesson, shown once answered */
const TRAPS = [

/* ---------------- negative stems ---------------- */
{t:"neg", c:16, q:"Which of the following is <b>not</b> one of Fayol's functions of management?",
 o:["Planning","Organising","Motivating","Controlling"], a:2,
 w:["Fayol's first function — setting objectives and deciding how to reach them.",
    "Fayol's second — establishing the structure of tasks and authority.",
    "",
    "Fayol's last — comparing actual against plan and correcting the difference."],
 why:"Fayol's five are <b>planning, organising, commanding, coordinating and controlling</b>. Motivating is not on the list — it belongs to the motivation theorists (Maslow, Herzberg, Vroom), not to Fayol. It feels right because motivating is obviously something managers do, which is exactly what makes it a good distractor."},

{t:"neg", c:6, q:"Which of the following is <b>not</b> one of Porter's five forces?",
 o:["The bargaining power of suppliers","The threat of government regulation","The threat of substitute products","Competitive rivalry in the industry"], a:1,
 w:["One of the five — suppliers who can dictate terms squeeze industry profit.",
    "",
    "One of the five — a substitute meets the same need by a different route.",
    "The fifth force, sitting at the centre of the model."],
 why:"The five forces are <b>new entrants, supplier power, buyer power, substitutes and rivalry</b>. Regulation is a real competitive pressure and it appears in PESTEL, but Porter deliberately left it out of the five forces. Two different models, both about the external environment — the examiner relies on you blurring them."},

{t:"neg", c:22, q:"Which of the following is <b>not</b> one of the fundamental principles in ACCA's Code of Ethics and Conduct?",
 o:["Objectivity","Independence","Confidentiality","Professional behaviour"], a:1,
 w:["One of the five fundamental principles.",
    "",
    "One of the five fundamental principles.",
    "One of the five fundamental principles."],
 why:"The five are <b>integrity, objectivity, professional competence and due care, confidentiality and professional behaviour</b>. Independence is a genuine and heavily discussed ethical concept — but it is a safeguard supporting objectivity, not one of the five principles. This is one of the most reliably examined traps in Part F."},

{t:"neg", c:7, q:"Which of the following is <b>not</b> an advantage of a tall organisational structure?",
 o:["Close supervision of subordinates","Clear lines of promotion","Faster communication from top to bottom","Narrow spans of control that allow closer control"], a:2,
 w:["A genuine advantage — narrow spans mean each manager watches fewer people.",
    "A genuine advantage — more layers means more rungs on the ladder.",
    "",
    "A genuine advantage, and the structural reason for the first one."],
 why:"A tall structure has <b>more layers</b>, so a message from the top passes through more hands and takes longer, with more chance of distortion. Fast vertical communication is an advantage of a <em>flat</em> structure. The option is tempting because everything else in the list is true, so by the fourth option you are reading on autopilot."},

/* ---------------- near-miss definitions ---------------- */
{t:"near", c:1, q:"Which of the following best describes <b>effectiveness</b>?",
 o:["Obtaining the resources needed at the lowest possible cost","Achieving the objective that was set","Getting the maximum output from a given set of inputs","Completing the task within the agreed time"], a:1,
 w:["That is <b>economy</b> — the first of the three Es.",
    "",
    "That is <b>efficiency</b> — the ratio of output to input.",
    "True of good performance generally, but it is not what the word means."],
 why:"The three Es: <b>economy</b> is buying inputs cheaply, <b>efficiency</b> is output per unit of input, <b>effectiveness</b> is hitting the objective. The one-line version worth memorising: efficiency is doing things right, effectiveness is doing the right things."},

{t:"near", c:12, q:"Which of the following best describes <b>information</b> as distinct from data?",
 o:["Facts and figures that have been recorded","Data that has been processed so it has meaning to the recipient","Any output produced by a computer system","Data that has been checked for accuracy"], a:1,
 w:["That is <b>data</b> — raw, unprocessed, not yet useful.",
    "",
    "Output can still be raw data; the medium is irrelevant to the definition.",
    "Accuracy is a quality of good information, not the thing that makes it information."],
 why:"Data becomes information when it is <b>processed into a form that means something to whoever receives it</b>. Note the last three words: the same report can be information to a manager and data to a director. Accuracy, completeness and timeliness are qualities of <em>good</em> information — the near-miss distractor takes one quality and passes it off as the definition."},

{t:"near", c:16, q:"A manager delegates a task to a subordinate. Which of the following is transferred?",
 o:["Accountability for the outcome","Authority to carry out the task","Responsibility and accountability together","Neither authority nor accountability"], a:1,
 w:["Accountability cannot be delegated — the manager still answers for it.",
    "",
    "Half right, which is what makes it dangerous: responsibility can pass, accountability cannot.",
    "Delegation without authority is not delegation — the subordinate could not act."],
 why:"Delegation passes <b>authority</b> (and with it responsibility for doing the work) down the line, but <b>accountability stays with the delegating manager</b>. Learn it as one sentence: you can delegate the task, never the blame. Three of these four options contain the word accountability, which is the tell that the question is about exactly that distinction."},

{t:"near", c:10, q:"Which of the following best describes <b>corporate governance</b>?",
 o:["The system by which organisations are directed and controlled","The day-to-day management of an organisation's operations","The legal requirements a company must meet to remain listed","The board's duty to maximise returns to shareholders"], a:0,
 w:["",
    "That is management. Governance is about how the directors are themselves directed and held to account.",
    "Listing rules are one mechanism of governance, not the definition of it.",
    "One objective often pursued through governance, not what the word means."],
 why:"Governance is the <b>system by which organisations are directed and controlled</b> — the Cadbury wording, and the examiner's. The other three are all things that sit near governance: management, regulation and shareholder interest. When one option is a textbook phrase and the others are plausible paraphrases of neighbouring ideas, the textbook phrase is usually the answer."},

/* ---------------- wrong attribution ---------------- */
{t:"attr", c:17, q:"Which theorist identified nine roles that must be filled for a team to work well?",
 o:["Tuckman","Belbin","Handy","Mintzberg"], a:1,
 w:["Tuckman described the <em>stages</em> a team passes through, not the roles within it.",
    "",
    "Handy is culture — the four Greek gods — and the shamrock organisation.",
    "Mintzberg is organisational structure and managerial roles."],
 why:"<b>Belbin</b> = team roles (plant, resource investigator, coordinator, shaper, monitor-evaluator, teamworker, implementer, completer-finisher, specialist). <b>Tuckman</b> = team stages. Both are about teams, both are named theorists, and swapping them is the single most common attribution error in Part D."},

{t:"attr", c:18, q:"Which theorist argued that the factors that cause dissatisfaction at work are different from those that cause satisfaction?",
 o:["Maslow","McGregor","Herzberg","Vroom"], a:2,
 w:["Maslow's hierarchy is one ladder of needs, not two separate sets of factors.",
    "McGregor gave us Theory X and Theory Y — assumptions managers hold about people.",
    "",
    "Vroom's expectancy theory multiplies valence by expectancy."],
 why:"<b>Herzberg's two-factor theory</b>: hygiene factors (pay, conditions, supervision, policy) remove dissatisfaction but never motivate; motivators (achievement, recognition, responsibility, advancement, the work itself) are what actually motivate. The two-set structure is the giveaway — Maslow is one ladder, Herzberg is two lists."},

{t:"attr", c:9, q:"Which theorist described organisational culture using four types named after Greek gods?",
 o:["Schein","Hofstede","Handy","Deal and Kennedy"], a:2,
 w:["Schein described culture in three <em>levels</em>: artefacts, espoused values, basic assumptions.",
    "Hofstede compared <em>national</em> cultures across dimensions such as power distance.",
    "",
    "Deal and Kennedy classified cultures by risk and feedback speed."],
 why:"<b>Handy</b>: power (Zeus), role (Apollo), task (Athena), person (Dionysus). All four names in this question are genuine culture theorists, which is what makes it hard — the examiner is not testing whether you know the theory, only whether you attached the right name to it."},

{t:"attr", c:7, q:"Which theorist identified the strategic apex, the operating core and the technostructure as building blocks of an organisation?",
 o:["Mintzberg","Fayol","Taylor","Drucker"], a:0,
 w:["",
    "Fayol gave the five functions of management and fourteen principles.",
    "Taylor is scientific management — one best way, time and motion.",
    "Drucker wrote on management by objectives and the purpose of a business."],
 why:"<b>Mintzberg's</b> building blocks are the strategic apex, middle line, operating core, technostructure and support staff. He is also the source of the ten managerial roles, so his name attaches to two separate examinable lists — keep them apart."},

/* ---------------- true but irrelevant ---------------- */
{t:"irr", c:13, q:"What is the <b>main purpose</b> of a system of internal control?",
 o:["To detect fraud committed by employees","To help the organisation achieve its objectives in an orderly and efficient way","To satisfy the requirements of the external auditor","To ensure the financial statements contain no errors"], a:1,
 w:["Controls do help deter and detect fraud, but that is one benefit, not the main purpose.",
    "",
    "Auditors rely on controls, but the controls exist for management, not for the audit.",
    "Controls reduce error; no system can eliminate it, and this is not their purpose."],
 why:"Every option here is a <b>true statement about internal control</b>. Only one answers the question asked, which was about the main purpose: controls exist so the business runs in an orderly, efficient way and meets its objectives. When several options are true, go back to the stem and read the qualifier — main, primary, best, most likely."},

{t:"irr", c:2, q:"A government raises interest rates. What is the <b>most likely immediate effect</b> on a business that sells consumer durables on credit?",
 o:["Its export prices become more competitive","Demand for its products falls","Its corporation tax liability rises","Its employees demand higher wages"], a:1,
 w:["Higher interest rates tend to <em>strengthen</em> the currency, making exports less competitive, not more.",
    "",
    "True that tax affects business, but interest rates and corporation tax are separate instruments.",
    "Possible eventually, but not the immediate effect, and not the mechanism being tested."],
 why:"The stem asks for the <b>most likely immediate effect</b> on a business selling on credit. Higher rates make borrowing dearer, so credit-financed demand falls first. The other options describe real macroeconomic effects that simply are not the one asked about — true, relevant to economics, irrelevant to this question."},

{t:"irr", c:1, q:"What is the <b>primary</b> purpose of a mission statement?",
 o:["To set out the organisation's overriding purpose and reason for existing","To provide measurable targets for the coming year","To satisfy a legal requirement for incorporated companies","To communicate financial performance to shareholders"], a:0,
 w:["",
    "Measurable targets are <em>objectives</em>. A mission is deliberately not measurable.",
    "There is no such legal requirement.",
    "That is the job of the financial statements."],
 why:"The hierarchy runs <b>mission → goals → objectives → plans</b>, getting more specific at each step. A mission states why the organisation exists; objectives are the SMART, measurable layer. Option B is a true description of something — just of the wrong level in the hierarchy."},

{t:"irr", c:5, q:"Why would an organisation most likely adopt sustainable business practices?",
 o:["Because sustainability reporting is compulsory for all companies","To reduce long-term risk and protect its reputation with stakeholders","Because environmental costs are always lower than conventional costs","To eliminate its impact on the natural environment"], a:1,
 w:["Reporting requirements vary by jurisdiction and size; universal compulsion is not true.",
    "",
    "Sustainable options are often cheaper over time, but always is doing too much work here.",
    "Reducing impact is achievable; eliminating it is not."],
 why:"The right answer is the one that is <b>merely reasonable</b>. Notice that two of the wrong options are also absolutes — <em>all</em> and <em>always</em> — so the traps compound. Examiners routinely stack an absolute inside a true-but-irrelevant question."},

/* ---------------- opposite pairs ---------------- */
{t:"opp", c:3, q:"Demand for a product is price inelastic. If the producer raises the price, total revenue will:",
 o:["Rise","Fall","Stay exactly the same","Fall, then rise as the market adjusts"], a:0,
 w:["",
    "This is what happens with <em>elastic</em> demand, where quantity falls proportionately more than price rises.",
    "That is unit elasticity, where PED is exactly 1.",
    "Not a standard elasticity outcome — invented movement to look sophisticated."],
 why:"Options A and B are direct opposites, and one of them is the answer — that is the structural clue. Inelastic means PED is <b>less than 1</b>: quantity falls proportionately less than price rises, so revenue rises. Rule of thumb worth carrying in: <b>inelastic, raise the price</b>."},

{t:"opp", c:7, q:"An organisation moves from a highly decentralised to a highly centralised structure. Which is the most likely consequence?",
 o:["Local managers respond faster to local conditions","Decisions become more consistent across the organisation","Junior managers gain more development opportunities","The organisation becomes more responsive to customers"], a:1,
 w:["That is an advantage of <em>de</em>centralisation — the direction they moved away from.",
    "",
    "Also decentralisation: making decisions is how junior managers learn.",
    "Also decentralisation, for the same reason as the first option."],
 why:"Three options describe the structure the organisation just <b>left</b>. Centralisation buys consistency, control and economies of scale, and pays for it with speed and local responsiveness. When a question describes a move from X to Y, read every option asking which end of the move it belongs to."},

{t:"opp", c:2, q:"A country's currency appreciates strongly against its trading partners' currencies. For a domestic manufacturer that exports most of its output, this is most likely to:",
 o:["Increase export volumes as its goods look more valuable","Reduce export volumes as its goods become more expensive abroad","Have no effect, since prices are set in the home currency","Reduce the cost of its domestic labour"], a:1,
 w:["Buyers abroad do not pay more for goods that merely look more valuable.",
    "",
    "The home price is fixed; the price the foreign buyer sees is not.",
    "Appreciation cuts the cost of imports, not of domestic labour."],
 why:"Again a matched pair — exports up or exports down — and again one of the pair is right. A stronger currency makes <b>exports dearer and imports cheaper</b>. Learn the pair as one sentence so it cannot come apart under pressure."},

{t:"opp", c:18, q:"According to Herzberg, an employee's salary is increased substantially. The most likely effect on motivation is that it will:",
 o:["Increase sharply and remain high","Not increase, though dissatisfaction may be removed","Increase only if the employee is at the self-actualisation stage","Decrease, because pay undermines intrinsic interest"], a:1,
 w:["This is the intuitive answer, and the whole point of Herzberg is that it is wrong.",
    "",
    "Mixes Herzberg with Maslow — two different models spliced together.",
    "An overstatement of a real idea, pushed past what Herzberg claims."],
 why:"Pay is a <b>hygiene factor</b>: too little causes dissatisfaction, more of it removes dissatisfaction but does not motivate. Options A and D are opposites bracketing the truth, which sits between them. The examiner's favourite Herzberg question, in exactly this shape."},

/* ---------------- absolutes ---------------- */
{t:"abs", c:17, q:"Which statement about groups and teams is correct?",
 o:["All groups within an organisation are teams","A team always outperforms the same individuals working alone","A team has a shared objective and mutual accountability, which a group need not have","Teams never suffer from conflict once they reach the performing stage"], a:2,
 w:["<em>All</em> — a group of people sharing a lift is not a team.",
    "<em>Always</em> — teams can underperform through groupthink or free-riding.",
    "",
    "<em>Never</em> — performing teams still hit conflict, and Tuckman allows re-storming."],
 why:"Three absolutes and one qualified statement. The qualified one is the answer. Scan for <b>all, always, never, must</b> first: it will not always give you the answer, but it will usually let you throw two options away in a few seconds."},

{t:"abs", c:12, q:"Which statement about accounting regulation is correct?",
 o:["All companies must have their financial statements audited","IFRS Standards are adopted by every country in the world","Accounting standards are issued to reduce the variety of accounting treatments in use","A company that follows accounting standards can never produce misleading accounts"], a:2,
 w:["<em>All</em> — small companies are exempt in many jurisdictions.",
    "<em>Every</em> — adoption is widespread but far from universal.",
    "",
    "<em>Never</em> — compliance reduces the risk of misleading accounts; it does not remove it."],
 why:"The one option without an absolute is also the one that describes what standards are actually <b>for</b>: narrowing the range of acceptable treatments so accounts can be compared. Notice how comfortable each absolute sounds when read quickly — that is the trap working."},

{t:"abs", c:15, q:"Which statement about money laundering is correct?",
 o:["An accountant must always report a suspicion to the authorities before telling the client","Money laundering only involves cash","Placement, layering and integration are the three stages of laundering","A transaction below the reporting threshold can never form part of laundering"], a:2,
 w:["The <em>always</em> is not the problem here — tipping off is genuinely prohibited — but the option misstates the sequence and duty.",
    "<em>Only</em> — laundering routinely runs through assets, invoices and electronic transfers.",
    "",
    "<em>Never</em> — structuring transactions below a threshold is itself a laundering technique."],
 why:"<b>Placement, layering, integration</b> — the three stages, and the answer here. This one shows the limit of the rule: absolutes usually signal a wrong option, but option A is wrong on its substance rather than its absoluteness. Use the absolutes rule to prioritise your reading, then verify on the content."},

{t:"abs", c:16, q:"Which statement about leadership style is correct?",
 o:["An autocratic style is always inappropriate in a modern organisation","The best style depends on the task, the subordinates and the situation","A democratic style always produces better decisions","Leaders must never change their style, or they will lose credibility"], a:1,
 w:["<em>Always</em> — autocratic works well in a crisis or with an inexperienced team.",
    "",
    "<em>Always</em> — democratic decisions are slow and can be poor under time pressure.",
    "<em>Never</em> — contingency theory says the opposite: adapt or fail."],
 why:"This is contingency theory in one question, and the answer is the hedged option again. The whole family of leadership models — Fiedler, Adair, Hersey-Blanchard, Blake and Mouton — points the same way: <b>style should fit the situation</b>. Any option denying that is almost certainly the distractor."}
];

TRAPS.forEach((t, i) => { t.id = "trap" + i; });

/* ---------------- the briefing ---------------- */
const PAPER = [
  ["2 hours",  "Duration"],
  ["100",      "Marks"],
  ["52",       "Questions"],
  ["50%",      "To pass"]
];

const SECTIONS = [
  ["Section A", "30 objective questions &times; 2 marks", "60"],
  ["Section A", "16 objective questions &times; 1 mark",  "16"],
  ["Section B", "6 multi-task questions &times; 4 marks — one from each capability A&ndash;F", "24"]
];

const PACE = [
  ["16 one-mark questions",  "about 30 seconds each",  "~8 min"],
  ["30 two-mark questions",  "about 1 min 20 each",    "~40 min"],
  ["6 four-mark task sets",  "about 5 minutes each",   "~30 min"],
  ["Flagged questions",      "second pass at the end", "~15 min"],
  ["Spare",                  "buffer, and it is real", "~27 min"]
];

const CHECKLIST = [
  ["Answer every single question.", "There is no negative marking, so a blank is a guaranteed zero and a guess is not. Before you submit, the flag list must be empty of unanswered items."],
  ["Never spend more than two minutes on one question.", "Flag it, put down your best option, move on. You can come back with a clearer head and the answer often arrives on the second reading."],
  ["Count the selections a question demands.", "Multiple-response questions usually give no partial credit. Two required means two — one right answer alone scores nothing."],
  ["On matching tasks, place what you are sure of first.", "Every pair you place narrows what is left. A task you could only half do at the start often finishes itself."],
  ["Read the stem again before you confirm.", "Most lost marks in BT are not gaps in knowledge. They are answering a slightly different question from the one printed."],
  ["Do not leave early.", "The exam is 2 hours and most candidates finish the first pass in 80 minutes. That spare time is worth several marks if you spend it re-reading flagged stems."]
];

/* Section titles exactly as published in the ACCA BT/FBT syllabus and study
   guide for September 2026 to June 2027. */
const CAPS = [
  ["A", "The business organisation and its external environment", "1&ndash;4, 6"],
  ["B", "Organisational structure, culture, governance and sustainability", "5, 7, 9, 10"],
  ["C", "Business functions, regulation and technology", "8, 11&ndash;15"],
  ["D", "Leadership and management", "16&ndash;19"],
  ["E", "Personal effectiveness and communication in business", "20&ndash;21"],
  ["F", "Professional ethics", "22"]
];
