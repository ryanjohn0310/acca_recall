/* =====================================================================
   Mock papers. Structure mirrors the real BT computer-based exam:
     Section A — 16 questions at 1 mark, 30 questions at 2 marks   (76)
     Section B —  6 multi-task questions at 4 marks, one per        (24)
                  capability A to F
   Every question carries a written explanation, shown in review.
   a: a number for one answer, an array for multiple response
      (multiple response scores nothing unless every selection is right,
      exactly as in the real exam).
   ===================================================================== */
const PAPERS = [];
/* Chapter to syllabus section. Chapter 8 (business functions and their
   relationship with accounting) is section C1, not B. */
const CAP_OF = {1:"A",2:"A",3:"A",4:"A",6:"A", 5:"B",7:"B",9:"B",10:"B",
                8:"C",11:"C",12:"C",13:"C",14:"C",15:"C", 16:"D",17:"D",18:"D",19:"D",
                20:"E",21:"E", 22:"F"};
const CAP_NAME = {
  A:"The business organisation and its external environment",
  B:"Organisational structure, culture, governance and sustainability",
  C:"Business functions, regulation and technology",
  D:"Leadership and management",
  E:"Personal effectiveness and communication in business",
  F:"Professional ethics"
};

PAPERS.push({
n:1, name:"Paper 1", note:"A balanced first sitting across the whole syllabus.",

/* ---------------- Section A — 16 questions, 1 mark each ---------------- */
a1:[
{c:2, q:"A recession is conventionally defined as two consecutive quarters of falling gross domestic product.",
 o:["True","False"], a:0,
 e:"Correct. Two consecutive quarters of falling GDP is the conventional working definition, and it sits in the recession phase of the business cycle."},

{c:1, q:"Limited liability limits the liability of the company itself for its debts.",
 o:["True","False"], a:1,
 e:"It limits the liability of the <b>owners</b>, to the amount unpaid on their shares. The company remains liable in full for every penny it owes."},

{c:3, q:"Demand for a product has a price elasticity of 1.8. Demand is:",
 o:["Elastic","Inelastic","Unit elastic","Perfectly inelastic"], a:0,
 e:"PED above 1 is elastic — quantity moves proportionately more than price, so a price rise cuts total revenue."},

{c:4, q:"Hofstede's dimensions were developed to compare:",
 o:["National cultures","Organisational cultures","Leadership styles","Team roles"], a:0,
 e:"Hofstede compared <b>national</b> cultures. Handy and Schein describe organisational culture; do not let the word culture blur them together."},

{c:6, q:"Which market structure has many firms selling a differentiated product with low barriers to entry?",
 o:["Perfect competition","Monopolistic competition","Oligopoly","Monopoly"], a:1,
 e:"Monopolistic competition: many firms, differentiated products, low barriers. Perfect competition requires an identical product."},

{c:7, q:"A flat organisational structure has a wide span of control.",
 o:["True","False"], a:0,
 e:"Fewer layers means each manager supervises more people, so spans are wide. Tall structures have narrow spans."},

{c:9, q:"In Handy's model, role culture is represented by which god?",
 o:["Zeus","Apollo","Athena","Dionysus"], a:1,
 e:"Apollo, god of order and rules — the bureaucratic, job-description culture. Zeus is power, Athena task, Dionysus person."},

{c:10, q:"Non-executive directors are employees of the company.",
 o:["True","False"], a:1,
 e:"NEDs sit on the board but are not employees and take no part in day-to-day management. That independence is the point of them."},

{c:11, q:"Which of the following is a source of long-term finance?",
 o:["Bank overdraft","Trade payables","Debentures","Factoring of receivables"], a:2,
 e:"Debentures are long-term borrowing. The other three are short-term working-capital sources."},

{c:12, q:"Why does a business prepare a statement of cash flows as well as a statement of profit or loss?",
 o:["Because profit and cash are not the same, and the statement shows how cash was generated and spent",
    "Because tax is charged on cash rather than on profit",
    "Because the statement of profit or loss is not audited",
    "Because it replaces the statement of financial position"], a:0,
 e:"A profitable business can still run out of cash. The statement of cash flows shows where cash actually came from and went, which the statement of profit or loss does not."},

{c:13, q:"Segregation of duties is best classified as which type of control?",
 o:["Detective","Preventive","Corrective","Directive"], a:1,
 e:"It stops one person completing a whole transaction unchecked, so it prevents error and fraud rather than finding them afterwards."},

{c:14, q:"A firewall is primarily a detective control.",
 o:["True","False"], a:1,
 e:"A firewall blocks unauthorised traffic before it arrives, so it is <b>preventive</b>. An access log is the detective control."},

{c:16, q:"Which theorist described ten managerial roles grouped as interpersonal, informational and decisional?",
 o:["Fayol","Mintzberg","Drucker","Taylor"], a:1,
 e:"Mintzberg. He is also the source of the organisational building blocks, so his name attaches to two examinable lists."},

{c:18, q:"The highest level of Maslow's hierarchy of needs is:",
 o:["Esteem","Belonging","Self-actualisation","Safety"], a:2,
 e:"Physiological, safety, belonging, esteem, self-actualisation. Only the top level is never fully satisfied."},

{c:20, q:"Which of the following is a recognised time-management technique?",
 o:["Prioritising tasks by urgency and importance","Working the longest hours the team will tolerate","Answering every email as it arrives","Avoiding delegation to keep control"], a:0,
 e:"The urgent/important grid is the standard technique. The other three are the classic time-wasting habits the syllabus warns about."},

{c:22, q:"Confidentiality is one of ACCA's five fundamental principles.",
 o:["True","False"], a:0,
 e:"Yes — integrity, objectivity, professional competence and due care, confidentiality, professional behaviour."}
],

/* ---------------- Section A — 30 questions, 2 marks each ---------------- */
a2:[
{c:1, q:"A charity, a listed company and a government department are compared. Which feature is common to all three?",
 o:["They pursue profit for owners","They are accountable to shareholders","They are social arrangements pursuing collective goals","They are financed by taxation"], a:2,
 e:"Buchanan and Huczynski's definition covers every organisation: a social arrangement pursuing collective goals, controlling its performance, with a boundary. Profit and shareholders apply to only one of the three."},

{c:1, q:"A pressure group has strong influence over regulators but little day-to-day interest in a company's operations. Using Mendelow's matrix, how should the company treat it?",
 o:["Key player — manage closely","Keep satisfied","Keep informed","Minimal effort"], a:1,
 e:"High power, low interest: keep them satisfied so their interest is never aroused. Interest can rise quickly, and then they become key players."},

{c:2, q:"A government cuts income tax and raises spending on infrastructure. This is:",
 o:["Expansionary monetary policy","Contractionary fiscal policy","Expansionary fiscal policy","Supply-side policy"], a:2,
 e:"Fiscal policy is taxation and government spending. Cutting tax and raising spending injects demand, so it is expansionary."},

{c:2, q:"Unemployment caused by a mismatch between workers' skills and the jobs available as industries decline is:",
 o:["Frictional","Structural","Cyclical","Seasonal"], a:1,
 e:"Structural unemployment. Frictional is the short gap between jobs; cyclical is caused by recession."},

{c:3, q:"A supermarket raises the price of its own-brand bread by 10% and total revenue from bread falls. This tells you demand for the bread is:",
 o:["Inelastic","Elastic","Unit elastic","A Giffen good"], a:1,
 e:"Revenue falling after a price rise means quantity fell proportionately more than price rose, so PED is greater than 1."},

{c:3, q:"The price of printers falls sharply and demand for printer ink rises. The cross elasticity of demand between the two is:",
 o:["Positive, because they are substitutes","Negative, because they are complements","Zero, because they are unrelated","Positive, because they are complements"], a:1,
 e:"Complements move in opposite directions on price and quantity, giving a negative XED. Substitutes give a positive figure."},

{c:4, q:"A country's population is ageing. Which is the most likely consequence for an employer?",
 o:["A larger pool of school leavers to recruit from","Pressure to retain and retrain older workers","Falling demand for healthcare services","A fall in pension costs"], a:1,
 e:"A shrinking working-age population forces employers to keep older workers longer. The other three run the wrong way."},

{c:6, q:"A new entrant to an industry faces high capital costs, established brands and exclusive supply contracts. In Porter's model these are:",
 o:["Substitutes","Barriers to entry","Buyer power","Competitive rivalry"], a:1,
 e:"They all raise the cost of entering, which weakens the threat of new entrants — the first of the five forces."},

{c:5, q:"Which statement best describes the triple bottom line?",
 o:["Profit measured before interest, tax and depreciation","Performance measured on economic, social and environmental terms","Three years of profit compared side by side","Profit shared between owners, employees and the community"], a:1,
 e:"People, planet, profit. It widens the definition of performance rather than recalculating the profit figure."},

{c:7, q:"An organisation groups staff into marketing, finance, production and HR departments. This is:",
 o:["A divisional structure","A functional structure","A matrix structure","A geographic structure"], a:1,
 e:"Grouping by specialism is functional. Divisional groups by product, market or region; matrix overlays two lines of authority."},

{c:7, q:"Which is the main disadvantage of a matrix structure?",
 o:["It prevents specialists from sharing knowledge","Dual reporting lines can create conflicting demands","It slows decision-making by adding layers","It makes cost control impossible"], a:1,
 e:"A matrix deliberately gives staff two bosses, which is its strength for cross-functional work and its weakness when the two disagree."},

{c:8, q:"Which activity is normally the responsibility of the purchasing function rather than production?",
 o:["Scheduling the production line","Supplier selection and negotiation","Quality control of finished goods","Maintaining plant and machinery"], a:1,
 e:"Purchasing sources inputs and manages suppliers. The other three sit inside operations."},

{c:9, q:"A small consultancy is built around one dominant founder who makes every significant decision personally. In Handy's terms this is:",
 o:["Power culture","Role culture","Task culture","Person culture"], a:0,
 e:"Power culture, drawn as a web with the founder at the centre. It is fast but depends entirely on one person's judgement."},

{c:10, q:"Which of the following is a principal function of an audit committee?",
 o:["Setting executive directors' pay","Reviewing the integrity of financial statements and the work of auditors","Appointing new executive directors","Approving the annual operating budget"], a:1,
 e:"Financial reporting integrity and oversight of internal and external audit. Pay belongs to the remuneration committee, appointments to nominations."},

{c:11, q:"Managing the levels of inventory, receivables and payables is best described as:",
 o:["Managing working capital","Preparing the statutory accounts","Conducting the external audit","Setting the corporate strategy"], a:0,
 e:"Working capital is the short-term money tied up in inventory and owed by or to the business. Managing it is a finance and treasury responsibility."},

{c:11, q:"Which is the main role of the treasury function?",
 o:["Preparing the statutory financial statements","Managing cash, funding and financial risk","Calculating product costs for pricing","Auditing the internal control system"], a:1,
 e:"Treasury handles liquidity, funding and hedging. Financial accounting produces the statements; management accounting costs the products."},

{c:12, q:"Which is a purpose of accounting standards?",
 o:["To guarantee that financial statements contain no errors","To reduce the variety of accounting treatments in use so accounts are comparable","To set the level of tax a company pays","To remove the need for an external audit"], a:1,
 e:"Standards narrow the range of acceptable treatments. They improve comparability; they do not eliminate error, set tax or replace audit."},

{c:12, q:"Which pair correctly matches the statement to what it reports?",
 o:["Statement of financial position — performance over a period","Statement of profit or loss — position at a point in time","Statement of cash flows — movements in cash over a period","Statement of changes in equity — the company's tax liability"], a:2,
 e:"The cash flow statement covers a period. Position is at a point in time; profit or loss covers a period; changes in equity reconciles opening to closing equity."},

{c:13, q:"An internal control system can provide management with:",
 o:["Absolute assurance that objectives will be met","Reasonable assurance, limited by cost and human error","A guarantee against fraud","Certainty that the accounts are free from misstatement"], a:1,
 e:"Every control system has inherent limitations — cost versus benefit, human error, collusion, management override. Reasonable assurance is the ceiling."},

{c:13, q:"Which of the following is a detective control?",
 o:["Requiring two signatures on a payment","Reconciling the bank statement to the cash book","Locking the stores after hours","Restricting system access by password"], a:1,
 e:"A reconciliation finds errors after the event. The other three stop something happening in the first place."},

{c:14, q:"Which is the clearest example of a preventive control over data security?",
 o:["An audit trail of user activity","An access control list restricting who can open a file","A monthly exception report","A backup taken every night"], a:1,
 e:"Access control stops the wrong person getting in. Audit trails and exception reports detect; backups correct."},

{c:15, q:"In money laundering, converting criminal cash into casino chips and back again is an example of:",
 o:["Placement","Layering","Integration","Tipping off"], a:0,
 e:"Placement is getting the cash into the financial system. Layering then disguises its trail, and integration returns it as apparently clean funds."},

{c:16, q:"A production line has broken down and a decision is needed within minutes. Which leadership style is most appropriate?",
 o:["Autocratic","Democratic","Laissez-faire","Consultative"], a:0,
 e:"Contingency theory: style should fit the situation. A crisis with no time to consult calls for a directive style, even in an organisation that is usually participative."},

{c:16, q:"Which best distinguishes leadership from management?",
 o:["Leadership is concerned with authority, management with influence","Leadership sets direction and inspires; management plans, organises and controls","Leadership applies only to senior staff","Management requires formal qualifications, leadership does not"], a:1,
 e:"Leaders set the direction and take people with them; managers make the existing system work. Position is not what separates them."},

{c:17, q:"A team has been working together for months, resolving disputes quickly and producing consistently good work. In Tuckman's model it is at the:",
 o:["Forming stage","Storming stage","Norming stage","Performing stage"], a:3,
 e:"Performing: the team is productive and handles conflict itself. Norming is where the rules settle but output is not yet at full pitch."},

{c:17, q:"A team consistently produces detailed, error-free work but repeatedly misses deadlines. Which Belbin role is most likely missing?",
 o:["Completer-finisher","Implementer","Plant","Monitor-evaluator"], a:1,
 e:"The work gets finished to a high standard but not turned into delivery on schedule — that is the implementer, who converts ideas into practical action and gets them done."},

{c:18, q:"An employee is given a large pay rise. According to Herzberg, the most likely effect on motivation is that it will:",
 o:["Rise sharply and stay high","Not rise, although dissatisfaction may be removed","Rise only if the employee is already satisfied","Fall, because pay undermines interest in the work"], a:1,
 e:"Pay is a hygiene factor. Too little causes dissatisfaction; more of it removes dissatisfaction without motivating."},

{c:19, q:"Which is the main purpose of an appraisal system?",
 o:["To provide evidence for dismissal","To review performance, agree objectives and plan development","To rank employees for redundancy selection","To set the annual pay award"], a:1,
 e:"Appraisal is a reward, performance and development process. Using it purely as a disciplinary tool is a recognised way to make it fail."},

{c:21, q:"A manager needs a permanent record of a complex instruction sent to twelve people in three countries. The most appropriate medium is:",
 o:["A telephone call to each person","A written email or memorandum","An informal conversation","A noticeboard notice"], a:1,
 e:"Complex, dispersed and needing a record: written wins. Oral media are better where feedback and tone matter more than permanence."},

{c:22, q:"An accountant is offered a substantial gift by a client shortly before completing work for them. Which threat to the fundamental principles does this create?",
 o:["Self-review threat","Familiarity and self-interest threat","Advocacy threat","Intimidation threat"], a:1,
 e:"A gift creates a self-interest threat, and closeness to the client creates familiarity. Self-review is reviewing your own work; advocacy is promoting a client's position."}
],

/* ---------------- Section B — 6 multi-task questions, 4 marks each ---------------- */
b:[
{c:3, s:"<b>Brightline Coaches</b> runs long-distance bus routes. Fares were raised by 10% last month. Passenger numbers fell by 4% and total revenue rose. On its city commuter route, where two rail operators compete directly, the same 10% rise cut passenger numbers by 22%.",
 t:[
  {q:"On the long-distance routes, demand is best described as:",
   o:["Elastic, PED greater than 1","Inelastic, PED less than 1","Unit elastic, PED equal to 1","Perfectly elastic"], a:1,
   e:"Quantity fell 4% for a 10% price rise, so PED is 0.4 — inelastic, which is why revenue rose."},
  {q:"Which two factors best explain why demand on the commuter route is more elastic? (Select two)",
   o:["Close substitutes are available","The journey is a small part of household income","Passengers have little time to change habits","The fare is a large regular expense for commuters","The service is a necessity with no alternative"], a:[0,3],
   e:"Elasticity rises when substitutes exist and when the item takes a large share of income. Both apply to a daily commute with two rail alternatives."}
 ]},

{c:7, s:"<b>Kestrel Foods</b> has grown from 40 to 900 employees in six years. It still runs a single functional structure with eleven layers between the chief executive and the factory floor. Managers report that decisions take weeks, and regional sales teams say head office does not understand local markets.",
 t:[
  {q:"Which structural change would most directly address both complaints?",
   o:["Adding a further layer of regional supervisors","Delayering and decentralising decisions to regional divisions","Centralising all decisions with the chief executive","Converting to a matrix structure for the finance function only"], a:1,
   e:"Eleven layers is the cause of the delay and the distance from local markets. Removing layers and pushing authority outward addresses both at once."},
  {q:"Which two are genuine risks of the change you identified? (Select two)",
   o:["Loss of consistency between regions","Slower response to local conditions","Reduced opportunities for junior managers","Duplication of activities across divisions","Weaker economies of scale in purchasing"], a:[0,4],
   e:"Decentralisation buys speed and local responsiveness, and pays for it in consistency and scale. It increases, not reduces, junior management development."}
 ]},

{c:13, s:"At <b>Harbour Print</b>, one clerk raises purchase orders, receives the goods, approves the invoice and sets up the supplier payment. The finance director signs payments in batches without reviewing the supporting documents. A supplier account has been paid twice in each of the last three months.",
 t:[
  {q:"The most significant control weakness is:",
   o:["The absence of a purchase order system","The lack of segregation of duties","The failure to obtain supplier statements","Batch processing of payments"], a:1,
   e:"One person controls the whole cycle from ordering to payment, so error and fraud can pass unchecked. Everything else is a symptom of that."},
  {q:"Which two controls would best address the duplicate payments? (Select two)",
   o:["Matching the invoice to the order and goods received note before payment","Increasing the payment authorisation limit","Monthly reconciliation of supplier statements to the payables ledger","Requiring the same clerk to review their own work","Paying suppliers weekly rather than monthly"], a:[0,2],
   e:"Three-way matching prevents the duplicate; supplier statement reconciliation detects any that get through. Preventive plus detective is the standard pairing."}
 ]},

{c:17, s:"<b>Ravenna Design</b> has formed a project team of six. Two months in, meetings are dominated by arguments over who leads which workstream, deadlines are slipping, and one member has stopped contributing. The project manager is considering intervening.",
 t:[
  {q:"In Tuckman's model the team is most likely at the:",
   o:["Forming stage","Storming stage","Norming stage","Dorming stage"], a:1,
   e:"Open conflict over roles and leadership is storming — a necessary stage, not a sign of failure, but one a manager should actively steer through."},
  {q:"Which two actions best reflect Adair's action-centred leadership in this situation? (Select two)",
   o:["Clarify the task and agree what success looks like","Wait for the team to resolve the conflict unaided","Address the needs of the individual who has withdrawn","Replace two team members to remove the conflict","Reduce the project scope so no decisions are needed"], a:[0,2],
   e:"Adair's three overlapping circles are task, team and individual. Clarifying the task and attending to the withdrawn individual address two of the three directly."}
 ]},

{c:21, s:"<b>Nadia</b> must tell forty staff across three sites that the office is relocating in six months. Some will face much longer journeys. She wants the message understood, wants to hear their concerns, and needs a record of what was communicated.",
 t:[
  {q:"Which approach best fits all three requirements?",
   o:["A single all-staff email","Site briefings with a question session, followed by written confirmation","A notice on each site noticeboard","Individual telephone calls over the following fortnight"], a:1,
   e:"Sensitive news needs a rich, two-way channel; the record needs writing. Doing both in sequence satisfies all three requirements — no single medium does."},
  {q:"Which two are barriers to effective communication that Nadia should most expect here? (Select two)",
   o:["Distortion of the message as it passes down the line","Perceptual bias, as staff hear the news through their own concerns","Excessive feedback from the audience","The absence of a formal grievance procedure","Use of technical jargon in a financial report"], a:[0,1],
   e:"Bad news travelling through several sites distorts, and anxious listeners filter what they hear. Feedback is what she wants, not a barrier."}
 ]},

{c:22, s:"<b>Tom</b>, a part-qualified accountant, is asked by his finance director to delay recognising 200,000 of supplier invoices until after the year end, so that the reported profit meets a bank covenant. The director tells him this is normal practice and that his promotion is being considered.",
 t:[
  {q:"Which fundamental principle is most directly threatened?",
   o:["Confidentiality","Integrity","Professional competence and due care","Professional behaviour"], a:1,
   e:"He is being asked to be party to information he knows to be misleading. That is integrity — being straightforward and honest — above all."},
  {q:"Which two threats does the director's approach create? (Select two)",
   o:["Self-interest threat, because promotion is linked to compliance","Self-review threat, because Tom prepared the figures","Intimidation threat, arising from the pressure applied by a superior","Advocacy threat, because Tom is promoting the company's position","Familiarity threat, because Tom has worked there a long time"], a:[0,2],
   e:"The promotion hint is self-interest; pressure from a senior is intimidation. Tom should follow the ethical conflict resolution process and escalate, documenting each step."}
 ]}
]
});
