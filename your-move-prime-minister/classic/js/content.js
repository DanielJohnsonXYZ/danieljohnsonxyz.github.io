/* Content library: decision cards, briefings and headlines.
   Event and briefing text is preserved from the original events-*.js / education.js files.
   Events are addressed by id, never by array position, so load order carries no meaning. */

const EVENTS = [];
function addEvents(...list){ EVENTS.push(...list); }

addEvents(
{
 id:"nhs_strike", icon:"🏥", category:"Crisis", title:"NHS STRIKE",
 text:"Junior doctors have rejected the government's latest pay offer. Your Health Secretary wants an answer today.",
 adviser:"The Chancellor", avatar:"£", adviserText:"Every extra percentage point costs real money. There is no magic NHS pot.",
 choices:[
  {t:"Give them 8%",s:"Resolve the strike quickly",e:{approval:4,britain:5,economy:-2,treasury:-7},h:"PM CAVES TO DOCTORS",d:"Extra £2bn found for health staff pay rise.",delay:{after:4,text:"The NHS settlement eases disruption, but borrowing is now higher.",e:{britain:3,economy:-2}}},
  {t:"Offer 5% + reform",s:"Split the difference",e:{approval:1,britain:2,power:2,treasury:-4},h:"PM BETS ON NHS COMPROMISE",d:"Ministers tie pay deal to productivity reforms.",delay:{after:5,text:"The reform package begins improving hospital productivity.",e:{britain:5,economy:1}}},
  {t:"Refuse",s:"Hold the fiscal line",e:{approval:-4,britain:-5,power:1},h:"NO DEAL: STRIKES TO CONTINUE",d:"Prime Minister refuses to increase pay offer.",delay:{after:3,text:"Cancelled appointments pile up as the strike drags on.",e:{approval:-3,britain:-4}}}
 ]
},
{
 id:"planning", icon:"🏠", category:"Policy", title:"BUILD, BABY, BUILD?",
 text:"Housebuilding has stalled. Your Housing Secretary wants sweeping planning reform, but dozens of your own MPs fear a backlash in their constituencies.",
 adviser:"Chief Whip", avatar:"🏛", adviserText:"The policy is popular nationally. That does not mean your MPs want it in their back gardens.",
 vote:true, bill:"Planning Reform Bill",
 choices:[
  {t:"Full planning reform",s:"Take on the rebels",e:{approval:2,economy:4,power:-5,housing:8},h:"PM DECLARES WAR ON NIMBYS",d:"Government launches the biggest planning shake-up in decades.",voteBoost:-8,delay:{after:6,text:"Housebuilding finally starts to rise, easing rents in major cities.",e:{economy:3,britain:4,approval:2}}},
  {t:"Compromise with MPs",s:"Weaker reform, safer vote",e:{approval:1,economy:2,power:2,housing:4},h:"PLANNING DEAL SAVES PM REVOLT",d:"Rebels win concessions on local development.",voteBoost:9,delay:{after:6,text:"The compromise increases construction, but less than ministers hoped.",e:{economy:1,britain:2}}},
  {t:"Drop the bill",s:"Avoid a party war",e:{approval:-2,power:4,housing:-3},h:"PM ABANDONS HOUSEBUILDING FIGHT",d:"Government shelves controversial planning reforms.",delay:{after:5,text:"Rents keep climbing as housing supply remains tight.",e:{approval:-3,britain:-3}}}
 ]
},
{
 id:"tax_gap", icon:"💷", category:"Treasury", title:"£18BN FISCAL HOLE",
 text:"New forecasts show government borrowing is far above plan. The Chancellor says you need tax rises, spending cuts, or a looser fiscal rule.",
 adviser:"The Chancellor", avatar:"£", adviserText:"You can dislike arithmetic. Unfortunately, arithmetic is not polling.",
 choices:[
  {t:"Raise income tax",s:"Stable finances, angry voters",e:{approval:-5,economy:-1,power:1,treasury:8},h:"PM BREAKS TAX TABOO",d:"Income tax rise announced to repair public finances."},
  {t:"Cut departmental budgets",s:"Protect tax promise",e:{approval:-2,britain:-6,treasury:7,power:-2},h:"WHITEHALL FACES AUSTERITY ROUND",d:"Departments ordered to find billions in savings.",delay:{after:5,text:"Cuts begin showing up in stretched public services.",e:{britain:-4,approval:-2}}},
  {t:"Borrow more",s:"Delay the pain",e:{approval:2,economy:2,treasury:-5,power:-1},h:"PM RIPS UP FISCAL RULE",d:"Government chooses higher borrowing over immediate cuts.",delay:{after:4,text:"Higher borrowing costs squeeze your next Budget.",e:{economy:-3,treasury:-4}}}
 ]
},
{
 id:"rates", icon:"🏦", category:"Economy", title:"CUT INTEREST RATES?",
 text:"Mortgage holders are furious about high interest rates. A tabloid campaign demands that you order an immediate rate cut.",
 adviser:"Cabinet Secretary", avatar:"⚖", adviserText:"Prime Minister, the Bank of England sets Bank Rate independently. You cannot simply order a cut.",
 choices:[
  {t:"Respect the Bank",s:"Defend independence",e:{power:2,approval:-1,economy:1},h:"PM BACKS INDEPENDENT BANK",d:"Downing Street refuses to interfere with interest-rate decisions."},
  {t:"Publicly pressure it",s:"Popular but risky",e:{approval:2,power:-3,economy:-2},h:"PM TURNS FIRE ON BANK",d:"Government accused of undermining monetary independence."},
  {t:"Cut taxes instead",s:"Use fiscal policy",e:{approval:3,economy:2,treasury:-5},h:"PM ANNOUNCES MORTGAGE TAX RELIEF",d:"Treasury unveils temporary household support."}
 ]
},
{
 id:"prisons", icon:"🔒", category:"Crisis", title:"PRISONS ARE FULL",
 text:"The prison estate is at 99% capacity. Courts may soon be unable to send convicted offenders to prison.",
 adviser:"Justice Secretary", avatar:"⚖", adviserText:"There are no good headlines here. We either create space, release people earlier, or stop sending as many people in.",
 choices:[
  {t:"Emergency early release",s:"Fast, politically painful",e:{approval:-4,britain:1,power:-2},h:"PRISONERS FREED EARLY",d:"Emergency scheme begins to prevent system collapse."},
  {t:"Build temporary prisons",s:"Expensive capacity",e:{treasury:-5,britain:3,approval:1},h:"MODULAR JAILS ORDERED",d:"Government spends billions on emergency prison capacity."},
  {t:"Tougher sentencing anyway",s:"Popular today",e:{approval:3,power:1,britain:-4},h:"PM DOUBLES DOWN ON TOUGH JUSTICE",d:"Sentencing crackdown announced despite capacity warnings.",delay:{after:3,text:"Courts postpone sentences because prisons have nowhere to put people.",e:{approval:-5,britain:-5,power:-2}}}
 ]
}
);
addEvents(
{
 id:"energy", icon:"⚡", category:"Energy", title:"ENERGY SHOCK",
 text:"Gas prices surge after an international supply disruption. Household bills are forecast to jump by 35%.",
 adviser:"Energy Secretary", avatar:"⚡", adviserText:"We can subsidise bills, accelerate domestic energy, or let prices transmit through the economy.",
 choices:[
  {t:"Cap household bills",s:"Protect families",e:{approval:5,treasury:-7,economy:2},h:"PM FREEZES ENERGY BILLS",d:"Treasury funds emergency household price cap."},
  {t:"Fast-track clean energy",s:"Slower but structural",e:{approval:1,economy:1,treasury:-3,britain:2},h:"ENERGY CRISIS SPARKS BUILDOUT",d:"Government accelerates grids, wind and nuclear approvals.",delay:{after:7,text:"New energy projects begin cutting Britain's exposure to gas shocks.",e:{economy:4,britain:4,approval:2}}},
  {t:"Let prices rise",s:"Protect the Treasury",e:{approval:-5,economy:-4,treasury:3,britain:-2},h:"HOUSEHOLDS FACE ENERGY HIT",d:"Government refuses a broad bailout."}
 ]
},
{
 id:"minister_scandal", icon:"📱", category:"Scandal", title:"THE WHATSAPPS LEAK",
 text:"Messages from your Home Secretary appear to mock civil servants and suggest announcing a policy mainly because it would 'play brilliantly on breakfast TV'.",
 adviser:"Chief of Staff", avatar:"📱", adviserText:"The messages are real. The question is whether you want this to become their scandal or yours.",
 choices:[
  {t:"Sack the minister",s:"Draw a line under it",e:{approval:2,power:1},h:"HOME SECRETARY SACKED",d:"Prime Minister acts within hours of leaked messages."},
  {t:"Stand by them",s:"Reward loyalty",e:{approval:-4,power:-2},h:"PM REFUSES TO SACK MINISTER",d:"Downing Street dismisses leak as a distraction.",delay:{after:2,text:"More messages leak, extending the scandal for another week.",e:{approval:-3,power:-2}}},
  {t:"Order an inquiry",s:"Classic Westminster",e:{approval:-1,power:1},h:"INQUIRY INTO LEAKED MESSAGES",d:"Independent adviser asked to establish what everyone already knows."}
 ]
},
{
 id:"rail", icon:"🚆", category:"Infrastructure", title:"RAILWAY MELTDOWN",
 text:"Signal failures and staff shortages cause a week of severe disruption. Mayors demand a major infrastructure package.",
 adviser:"Transport Secretary", avatar:"🚆", adviserText:"The railway needs boring long-term investment. Unfortunately, voters are angry right now.",
 choices:[
  {t:"Fund a rail upgrade",s:"Expensive, long term",e:{treasury:-6,economy:2,britain:3},h:"£12BN RAIL PLAN UNVEILED",d:"Government bets on infrastructure investment.",delay:{after:6,text:"Journey reliability improves as the first rail upgrades come online.",e:{economy:3,britain:4,approval:2}}},
  {t:"Compensate passengers",s:"Cheaper quick relief",e:{treasury:-2,approval:3,britain:1},h:"COMMUTERS GET PAYOUTS",d:"Automatic compensation ordered after rail chaos."},
  {t:"Blame the operator",s:"Free, maybe effective",e:{approval:1,power:-1,britain:-2},h:"PM BLASTS RAIL BOSSES",d:"Downing Street demands answers but announces no new money."}
 ]
},
{
 id:"migration", icon:"🛂", category:"Home Affairs", title:"ASYLUM BACKLOG",
 text:"The asylum backlog reaches a new high. Hotels are costing the government millions each day and local councils are furious.",
 adviser:"Home Secretary", avatar:"🛂", adviserText:"Speed, deterrence and legal robustness are pulling in different directions.",
 choices:[
  {t:"Hire 2,000 caseworkers",s:"Process claims faster",e:{treasury:-3,britain:4,approval:1},h:"ASYLUM TASKFORCE EXPANDED",d:"Government hires thousands to clear old cases.",delay:{after:5,text:"The asylum backlog begins falling as case decisions accelerate.",e:{britain:3,approval:2,treasury:2}}},
  {t:"Introduce harsher rules",s:"Deterrence first",e:{approval:2,power:-2,britain:-1},h:"PM UNVEILS ASYLUM CRACKDOWN",d:"New restrictions trigger legal challenges.",delay:{after:3,text:"A court blocks part of the asylum package, forcing ministers back to Parliament.",e:{power:-4,approval:-1}}},
  {t:"Give councils more money",s:"Ease local pressure",e:{treasury:-4,britain:2,approval:1},h:"COUNCILS GET MIGRATION CASH",d:"Emergency funding announced for affected areas."}
 ]
},
{
 id:"schools", icon:"🎓", category:"Education", title:"TEACHER SHORTAGE",
 text:"Schools report severe shortages in maths, science and computing teachers. The Education Secretary wants a retention package.",
 adviser:"Education Secretary", avatar:"🎓", adviserText:"Recruitment campaigns are easy. Keeping experienced teachers is the hard part.",
 choices:[
  {t:"Raise teacher pay",s:"Expensive retention boost",e:{treasury:-5,britain:4,approval:2},h:"TEACHERS WIN PAY BOOST",d:"Government targets shortage subjects with higher salaries.",delay:{after:6,text:"Teacher vacancy rates begin to fall.",e:{britain:4,economy:1}}},
  {t:"Offer tax-free bonuses",s:"Target shortage subjects",e:{treasury:-3,britain:3,approval:1},h:"STEM TEACHERS OFFERED BONUSES",d:"New retention scheme targets hard-to-fill subjects."},
  {t:"Launch a recruitment campaign",s:"Cheap and visible",e:{treasury:-1,approval:1,britain:-1},h:"NEW DRIVE TO RECRUIT TEACHERS",d:"Ministers unveil national advertising campaign."}
 ]
}
);
addEvents(
{
 id:"defence", icon:"🛡️", category:"International", title:"NATO SUMMIT",
 text:"Allies want Britain to increase defence spending after a sharp deterioration in European security.",
 adviser:"Foreign Secretary", avatar:"🌍", adviserText:"Our allies will remember what we do. So will the Treasury.",
 choices:[
  {t:"Increase defence spending",s:"Reassure allies",e:{treasury:-6,power:3,economy:1},h:"BRITAIN BOOSTS DEFENCE BUDGET",d:"Prime Minister commits billions to military investment."},
  {t:"Hold spending flat",s:"Protect domestic budgets",e:{treasury:2,power:-2,approval:1},h:"PM RESISTS NATO PRESSURE",d:"Britain declines a major defence increase."},
  {t:"European defence pact",s:"Share capability",e:{treasury:-3,power:4,economy:1},h:"NEW EUROPEAN DEFENCE DEAL",d:"Britain proposes joint procurement and capabilities."}
 ]
},
{
 id:"local_elections", icon:"🗳️", category:"Politics", title:"LOCAL ELECTION SHOCK",
 text:"Your party loses control of several councils. Backbench MPs are suddenly worried about their own seats.",
 adviser:"Party Chair", avatar:"🗳", adviserText:"They don't all hate your agenda. They mostly hate the possibility of unemployment.",
 choices:[
  {t:"Stay the course",s:"Project confidence",e:{power:2,approval:-1},h:"PM: NO CHANGE OF COURSE",d:"Downing Street insists voters support the government's long-term plan."},
  {t:"Reshuffle the Cabinet",s:"Show change",e:{approval:2,power:-1},h:"PM WIELDS THE AXE",d:"Major reshuffle follows local election losses."},
  {t:"Move to popular policies",s:"Follow the polls",e:{approval:3,power:-3},h:"DOWNING STREET PIVOTS",d:"Government quietly shelves its most difficult reforms."}
 ]
},
{
 id:"flood", icon:"🌧️", category:"Emergency", title:"SEVERE FLOODING",
 text:"Days of rain cause major flooding across parts of England and Wales. Thousands of homes are affected.",
 adviser:"Environment Secretary", avatar:"🌧", adviserText:"You need emergency relief now, but the resilience problem is much bigger than this week's headlines.",
 choices:[
  {t:"Emergency relief + resilience",s:"Act now and invest",e:{treasury:-5,britain:5,approval:3},h:"PM PLEDGES FLOOD DEFENCES",d:"Emergency aid paired with long-term resilience programme."},
  {t:"Emergency relief only",s:"Handle immediate crisis",e:{treasury:-2,britain:2,approval:2},h:"FLOOD VICTIMS GET EMERGENCY AID",d:"Government focuses on short-term recovery."},
  {t:"Leave response to councils",s:"Keep Whitehall out",e:{treasury:1,britain:-4,approval:-3},h:"COUNCILS LEFT TO FIGHT FLOODS",d:"Ministers resist calls for a national package."}
 ]
},
{
 id:"ai_jobs", icon:"🤖", category:"Economy", title:"AI JOBS BOOM... OR BUST?",
 text:"A wave of AI investment promises productivity gains, but unions warn of large job losses in administration and customer service.",
 adviser:"Business Secretary", avatar:"🤖", adviserText:"The technology is arriving whether we like it or not. The policy question is who captures the upside.",
 choices:[
  {t:"AI investment + retraining",s:"Back adoption and skills",e:{treasury:-4,economy:5,britain:2},h:"PM BACKS AI REVOLUTION",d:"Government launches investment and retraining package.",delay:{after:6,text:"Business productivity rises as AI adoption spreads.",e:{economy:5,approval:1}}},
  {t:"Worker protection rules",s:"Slow disruption",e:{economy:-1,britain:3,approval:2},h:"NEW RULES FOR AI AT WORK",d:"Employers face stricter consultation requirements."},
  {t:"Let the market decide",s:"No new intervention",e:{economy:3,approval:-1,britain:-2},h:"PM TAKES HANDS-OFF AI APPROACH",d:"Government declines major new regulation or support."}
 ]
},
{
 id:"lords", icon:"👑", category:"Parliament", title:"THE LORDS SEND IT BACK",
 text:"The House of Lords heavily amends your flagship Public Safety Bill. Your MPs demand that you reject the changes.",
 adviser:"Leader of the House", avatar:"👑", adviserText:"The Lords can delay and amend. Ultimately the elected Commons has the stronger democratic mandate, but this can still eat parliamentary time.",
 vote:true,bill:"Public Safety Bill",
 choices:[
  {t:"Reject the amendments",s:"Fight the Lords",e:{power:2,approval:1},h:"COMMONS-LORDS SHOWDOWN",d:"Government sends the bill back unchanged.",voteBoost:7},
  {t:"Accept most changes",s:"Compromise",e:{power:1,britain:2},h:"PM CUTS DEAL WITH LORDS",d:"Ministers accept safeguards to secure the legislation.",voteBoost:-2},
  {t:"Abandon the bill",s:"Save parliamentary time",e:{power:-5,approval:-2},h:"FLAGSHIP BILL DROPPED",d:"Government gives up after months of parliamentary fighting."}
 ]
}
);
addEvents(
{
 id:"by_election", icon:"📍", category:"Politics", title:"THE BY-ELECTION",
 text:"A resignation triggers a by-election in a marginal seat. Losing it would make your parliamentary majority look dangerously fragile.",
 adviser:"Party Chair", avatar:"📍", adviserText:"The constituency wants local answers, not a lecture about the national strategy.",
 choices:[
  {t:"Campaign personally",s:"High risk, high reward",e:{approval:1,power:3},h:"PM HITS BY-ELECTION TRAIL",d:"Prime Minister stakes personal authority on marginal contest."},
  {t:"Send senior ministers",s:"Limit your exposure",e:{power:1},h:"CABINET FLOODS MARGINAL SEAT",d:"Senior ministers descend on the constituency."},
  {t:"Stay away",s:"Focus on governing",e:{power:-2,approval:-1},h:"PM AVOIDS TROUBLED BY-ELECTION",d:"Opposition claims Downing Street has given up."}
 ]
},
{
 id:"growth_budget", icon:"📊", category:"Budget", title:"THE GROWTH BUDGET",
 text:"Growth has stalled. The Chancellor offers you a menu: infrastructure, business tax cuts, or immediate household giveaways.",
 adviser:"The Chancellor", avatar:"£", adviserText:"All three can be called 'pro-growth'. Only one gets the bulk of the money.",
 choices:[
  {t:"Infrastructure",s:"Slow, structural",e:{treasury:-6,economy:3,britain:2},h:"BUDGET BETS ON INFRASTRUCTURE",d:"Government prioritises transport, energy and housing.",delay:{after:5,text:"Investment begins lifting construction and private-sector confidence.",e:{economy:4,britain:2}}},
  {t:"Business tax cuts",s:"Investment incentive",e:{treasury:-5,economy:4,approval:-1},h:"CHANCELLOR CUTS BUSINESS TAX",d:"Treasury bets on private investment."},
  {t:"Household rebate",s:"Immediate popularity",e:{treasury:-5,approval:5,economy:1},h:"VOTERS GET £400 BUDGET REBATE",d:"Household giveaway dominates the Budget."}
 ]
},
{
 id:"pmqs", icon:"🎙️", category:"PMQs", title:"PRIME MINISTER'S QUESTIONS",
 text:"The Opposition Leader attacks your record: 'Waiting lists are up, rents are up, and the Prime Minister says everything is going to plan. Why should anyone believe them?'",
 adviser:"Communications Director", avatar:"🎙", adviserText:"Answer the question if you can. Attack them if you can't. Whatever you do, don't look rattled.",
 choices:[
  {t:"Answer directly",s:"Defend your record",e:{approval:2,power:2},h:"PM STANDS GROUND AT PMQS",d:"Downing Street pleased with a disciplined performance."},
  {t:"Attack the opposition",s:"Fire up your side",e:{power:3,approval:-1},h:"FIERY PMQS CLASH",d:"Commons erupts as leaders trade attacks."},
  {t:"Make a joke",s:"Could be brilliant",e:{approval:3,power:-1},h:"PMQS LINE GOES VIRAL",d:"Prime Minister lands the line of the session."}
 ]
},
{
 id:"data_breach", icon:"💻", category:"Security", title:"GOVERNMENT DATA BREACH",
 text:"A cyberattack compromises data held by a government contractor. The scale is not yet clear.",
 adviser:"Cabinet Secretary", avatar:"💻", adviserText:"You can disclose early with incomplete facts, or wait and risk looking like you hid it.",
 choices:[
  {t:"Disclose immediately",s:"Transparency first",e:{approval:1,power:1,britain:-1},h:"GOVERNMENT REVEALS CYBER BREACH",d:"Ministers publish early details and launch investigation."},
  {t:"Wait for full facts",s:"Reduce uncertainty",e:{power:-1},h:"WHITEHALL INVESTIGATES CYBERATTACK",d:"Government delays public statement pending technical assessment.",delay:{after:2,text:"Journalists learn of the breach before the official announcement.",e:{approval:-4,power:-2}}},
  {t:"Blame the contractor",s:"Distance government",e:{approval:-1,power:-1},h:"MINISTERS BLAME CONTRACTOR",d:"Questions grow over government procurement and oversight."}
 ]
},
{
 id:"final_budget", icon:"🧾", category:"Final year", title:"ONE LAST BUDGET",
 text:"The election is approaching. You can shore up the public finances, offer voters a pre-election tax cut, or fund struggling public services.",
 adviser:"The Chancellor", avatar:"£", adviserText:"This will be judged as economics and as electioneering. There is no separating the two now.",
 choices:[
  {t:"Repair the finances",s:"Responsible, less exciting",e:{treasury:7,economy:2,approval:-1},h:"CHANCELLOR BANKS ELECTION WAR CHEST",d:"Government prioritises fiscal headroom."},
  {t:"Cut taxes",s:"Go for popularity",e:{treasury:-6,approval:5,economy:2},h:"TAX CUT BEFORE ELECTION",d:"Opposition accuses PM of pre-election giveaway."},
  {t:"Fund public services",s:"Visible improvement",e:{treasury:-6,britain:5,approval:3},h:"BILLIONS FOR NHS AND SCHOOLS",d:"Final Budget targets frontline services."}
 ]
}
);
addEvents(
{
 id:"election", icon:"🗳️", category:"Election", title:"CALL THE ELECTION",
 text:"Five years are up. Parliament must face the voters. Your record is about to become a seat count.",
 adviser:"Party Chair", avatar:"🗳", adviserText:"There are no more policy announcements that can save us. This is the exam.",
 final:true,
 choices:[
  {t:"Fight on the record",s:"Own your government",e:{power:2},h:"PM: JUDGE ME ON MY RECORD",d:"Election campaign begins with a defence of five years in office."},
  {t:"Promise a fresh start",s:"Distance yourself from mistakes",e:{approval:1,power:-1},h:"PM PROMISES NEW CHAPTER",d:"Government campaigns on change after five years in power."},
  {t:"Attack the opposition",s:"Make it a choice",e:{power:2,approval:-1},h:"ELECTION TURNS NEGATIVE",d:"Prime Minister launches fierce attack on opposition plans."}
 ]
}
);

const BRIEFINGS = {
  nhs_strike:{explainer:"The NHS is publicly funded, but the government does not simply set every employee's pay by decree. Pay settlements interact with departmental budgets, inflation, recruitment and other public-sector workers who may demand similar treatment.",control:"You can fund a higher settlement and set the negotiating mandate. You cannot make doctors accept it, and extra spending must come from taxes, borrowing or another budget.",stakeholders:[["Doctors","Higher pay, better staffing and working conditions","👩‍⚕️"],["Treasury","Keep spending and borrowing under control","💷"],["Patients","End disruption and reduce waiting lists","🧑‍🧑‍🧒"],["Your MPs","Avoid an unpopular strike without looking weak","🏛️"]]},
  planning:{explainer:"National government can change planning law, but most individual planning decisions are made locally. New homes also depend on land, infrastructure, builders, finance and local political consent.",control:"You can rewrite national planning rules and fund infrastructure. Councils still implement much of the system, and MPs may rebel if development is unpopular in their seats.",stakeholders:[["Renters","More homes and lower housing costs","🔑"],["Homeowners","Protect local character and property values","🏡"],["Builders","Faster permissions and viable projects","🏗️"],["Backbench MPs","Avoid local backlash","🏛️"]]},
  tax_gap:{explainer:"A fiscal hole means expected government revenue no longer covers planned spending under the rules the government has chosen. There is no painless fix: taxes, spending, borrowing or the fiscal rules themselves have to move.",control:"Government controls most major taxes and departmental spending, but financial markets influence borrowing costs and economic growth changes the numbers again.",stakeholders:[["Taxpayers","Keep more of their income","👛"],["Public services","Protect budgets","🏥"],["Investors","Credible and sustainable finances","📈"],["Your party","Keep manifesto promises","🎗️"]]},
  rates:{explainer:"The Bank of England's Monetary Policy Committee sets Bank Rate independently. That separation is designed to stop governments manipulating interest rates for short-term political advantage.",control:"You cannot order an interest-rate cut. You can change taxes, spending, regulation and supply-side policy, which can indirectly affect inflation and growth.",stakeholders:[["Mortgage holders","Lower monthly payments","🏠"],["Bank of England","Bring inflation to target","🏦"],["Savers","Reasonable returns on savings","💰"],["Treasury","Avoid policies that push inflation up","💷"]]},
  prisons:{explainer:"Prisons are the end of a chain involving police, prosecutors, courts, sentencing law, probation and prison capacity. Tougher sentences can increase demand for places years after a policy is announced.",control:"Government can fund prisons and change sentencing law, but judges decide individual sentences within the law and construction takes time.",stakeholders:[["Public","Safety and punishment","👥"],["Judges","A workable justice system","⚖️"],["Prison service","Safe capacity and staffing","🔒"],["Treasury","Control a very expensive system","💷"]]},
  energy:{explainer:"Britain buys and sells energy in international markets. Government can cushion prices or change the energy mix, but it cannot command the global gas price.",control:"You can subsidise households, tax producers, approve infrastructure and alter regulation. Long-term energy projects take years to affect supply.",stakeholders:[["Households","Affordable bills","🏠"],["Energy firms","Stable investment rules","⚡"],["Treasury","Limit subsidy costs","💷"],["Climate groups","Move away from fossil fuels","🌱"]]},
  minister_scandal:{explainer:"The Prime Minister appoints and dismisses ministers, but ministerial standards, Parliament, the press and public expectations all shape whether a scandal survives.",control:"You can sack, defend or investigate a minister. You cannot control what further evidence emerges or whether the story dominates the media.",stakeholders:[["Minister","Keep their job","🧑‍💼"],["Media","Find new evidence and accountability","📰"],["Your MPs","Stop the scandal hurting them locally","🏛️"],["Public","Competence and standards","👥"]]},
  rail:{explainer:"Rail performance mixes private operators, public contracts, Network Rail infrastructure, unions and long investment cycles. Compensation can ease anger without fixing capacity.",control:"Government can fund infrastructure, specify many rail contracts and change the structure of the system. It cannot repair years of underinvestment overnight.",stakeholders:[["Passengers","Reliable affordable journeys","🚆"],["Treasury","Control subsidy and capital costs","💷"],["Rail workforce","Staffing and employment terms","👷"],["Mayors","Better regional connectivity","🏙️"]]},
  migration:{explainer:"Immigration and asylum policy combines border control, international law, courts, Home Office administration, local government and the labour market. Announcing a rule is not the same as implementing it.",control:"Government can change immigration rules and administrative resources, but courts can review legality and councils handle many local consequences.",stakeholders:[["Home Office","A system it can actually administer","🛂"],["Councils","Funding for local pressure","🏘️"],["Employers","Access to workers","🏢"],["Voters","Control, fairness and competence","🗳️"]]},
  schools:{explainer:"Education policy is national in some respects, but schools, academy trusts, local authorities and labour-market conditions all affect whether teachers are actually recruited and retained.",control:"You can change funding, pay frameworks and incentives. You cannot instantly create experienced teachers in shortage subjects.",stakeholders:[["Teachers","Pay, workload and career conditions","🎓"],["Schools","Fill vacancies","🏫"],["Parents","Stable high-quality teaching","👪"],["Treasury","Keep recurring payroll costs manageable","💷"]]},
  defence:{explainer:"NATO is an alliance, not a world government. Britain chooses its own defence budget but its choices affect credibility with allies and the military capability available in a crisis.",control:"You can set UK defence spending and negotiate with allies. You cannot dictate what other NATO members spend or eliminate security risks through a budget announcement.",stakeholders:[["NATO allies","Credible burden-sharing","🤝"],["Armed forces","Equipment, people and readiness","🛡️"],["Treasury","Protect other budgets","💷"],["Public","Security at a reasonable cost","👥"]]},
  local_elections:{explainer:"Local elections choose councils, not the national government, but they are also a live test of political mood. MPs often read local results as a warning about their own seats.",control:"You cannot overturn local results. You can change personnel, message or policy, but each response tells your party what you think went wrong.",stakeholders:[["Councillors","Win local power","🏘️"],["Backbench MPs","Protect their seats","🏛️"],["Party members","See their priorities reflected","🎗️"],["Voters","Send a message between general elections","🗳️"]]},
  flood:{explainer:"Flood response is shared across emergency services, councils, the Environment Agency, insurers and national government. Emergency money treats damage; resilience spending reduces future risk.",control:"You can coordinate national relief and fund defences. You cannot stop extreme weather or make every property insurable immediately.",stakeholders:[["Residents","Safety and compensation","🏠"],["Councils","Emergency resources","🏘️"],["Environment Agency","Long-term resilience investment","🌧️"],["Treasury","Limit permanent spending commitments","💷"]]},
  ai_jobs:{explainer:"Government does not decide whether firms adopt new technology. It shapes incentives, skills, worker protections, competition and regulation around that adoption.",control:"You can fund training, regulate employment practices and support investment. You cannot freeze technological change or guarantee which jobs firms create.",stakeholders:[["Workers","Security and retraining","👩‍💻"],["Businesses","Productivity and flexible adoption","🏢"],["Tech sector","Investment-friendly rules","🤖"],["Treasury","Higher long-term productivity","💷"]]},
  lords:{explainer:"Most bills must pass both the Commons and the Lords. The Lords can amend and delay legislation, although the elected Commons ultimately has greater democratic authority and special rules can limit the Lords' power.",control:"Your majority helps in the Commons. In the Lords you may need negotiation, repeated votes or to spend valuable parliamentary time.",stakeholders:[["Commons MPs","Deliver the manifesto","🏛️"],["House of Lords","Scrutinise and revise","👑"],["Campaign groups","Change specific clauses","📣"],["Whips","Get the votes through","📋"]]},
  by_election:{explainer:"A by-election fills one vacant Commons seat. It can change a narrow majority directly, but its political importance is often bigger because parties treat it as a verdict on the government.",control:"You can choose campaign strategy and resources. You cannot make national popularity translate neatly into one constituency.",stakeholders:[["Local voters","Local representation and issues","📍"],["Party HQ","Win the seat","🎗️"],["Your MPs","Read the result as a warning","🏛️"],["Media","Turn one result into a national story","📰"]]},
  growth_budget:{explainer:"Budgets redistribute resources and change incentives, but economic growth depends on investment, productivity, labour, demand and global conditions. Different policies act over different timescales.",control:"You can change taxes and public investment. You cannot guarantee that firms invest or that infrastructure produces growth immediately.",stakeholders:[["Businesses","Demand and investment incentives","🏢"],["Households","Income and living standards","👛"],["Treasury","Value for money and fiscal credibility","💷"],["Future government","Benefits or liabilities you leave behind","⏳"]]},
  pmqs:{explainer:"Prime Minister's Questions does not make law. It is parliamentary scrutiny performed in public, where political authority, accountability and media narratives are tested.",control:"You control your answer and political strategy. You cannot control the question, chamber reaction or which clip dominates the news afterwards.",stakeholders:[["Opposition","Expose weakness","🔴"],["Your MPs","See a confident leader","🏛️"],["Media","Find the decisive moment","📺"],["Public","Judge competence and honesty","👥"]]},
  data_breach:{explainer:"Government often relies on contractors and interconnected digital systems. Accountability still comes back to ministers even when the technical failure occurs outside a department.",control:"You can disclose, investigate, regulate suppliers and change procurement. You cannot make stolen data secret again.",stakeholders:[["Affected citizens","Know what happened and be protected","👥"],["Security teams","Contain the breach","🔐"],["Contractor","Limit liability and reputational damage","🏢"],["Opposition","Test government competence","🏛️"]]},
  final_budget:{explainer:"A pre-election Budget is both economic policy and politics. Measures can help households now while creating costs, taxes or borrowing pressures for the next government.",control:"You can choose the fiscal package, subject to Parliament. You cannot stop voters judging whether it is responsible policy or an election giveaway.",stakeholders:[["Voters","Feel better off","🗳️"],["Public services","Secure funding","🏥"],["Treasury","Sustainable finances","💷"],["Opposition","Frame your Budget as failure or bribery","🔴"]]},
  election:{explainer:"A UK general election is won constituency by constituency under first-past-the-post. National vote share matters, but where those votes are located determines the Commons majority.",control:"You can choose campaign strategy and defend your record. You cannot convert approval directly into seats; geography and opposition performance matter.",stakeholders:[["Voters","Choose their local MP","🗳️"],["Candidates","Win individual constituencies","📍"],["Party HQ","Target marginal seats","🎗️"],["Media","Shape the campaign agenda","📰"]]},
  eastern_europe_crisis:{explainer:"A major war in Europe is not something a British Prime Minister controls. Britain can shape sanctions, military support, diplomacy and alliances, but every choice has security, fiscal and escalation risks.",control:"You control the UK's diplomatic position and can propose military and financial support. Parliament, allies, military capacity, international law and the actions of the countries at war constrain what happens next.",stakeholders:[["Allies","A united and credible response","🤝"],["Armed forces","Clear objectives and sustainable commitments","🛡️"],["Treasury","Know the cost and duration","💷"],["Public","Security without uncontrolled escalation","👥"]]},
  shipping_shock:{explainer:"Britain is deeply connected to global trade. A conflict or blockage thousands of miles away can raise shipping, fuel and food costs at home before ministers have done anything.",control:"You cannot reopen an international trade route by decree. You can coordinate with allies, support affected firms and households, and change domestic policy to absorb some of the shock.",stakeholders:[["Consumers","Keep prices down","🛒"],["Businesses","Reliable imports and lower freight costs","🚢"],["Treasury","Avoid an open-ended bailout","💷"],["Allies","Coordinate a security response","🌍"]]},
  leadership_rumours:{explainer:"A Prime Minister's authority rests on the perception that their own MPs will follow them. Rumours of a challenge can matter more than an actual challenge, because they change how loyally ministers and backbenchers behave in the meantime.",control:"You can change personnel, tone or policy. You cannot stop backbenchers talking to journalists, and denying a rumour often keeps it alive longer than ignoring it.",stakeholders:[["Backbench MPs","A leader who can win them the next election","🏛️"],["Cabinet","Clarity about who is really in charge","🧑‍💼"],["Media","A leadership story to report","📰"],["Party members","Unity rather than another contest","🎗️"]]},
  winter_crisis:{explainer:"Health demand is seasonal: cold weather, flu and staff absence combine every winter, and a system with no spare capacity has nowhere to put the surge. Emergency funding buys capacity; cancelling other care simply moves the queue.",control:"You can fund extra beds and staff, or free up capacity by delaying other treatment. You cannot shorten winter, and money announced this week does not become trained staff overnight.",stakeholders:[["Patients in A&E","To be seen quickly","🧑‍🤝‍🧑"],["Patients waiting for routine care","Their operation is not cancelled again","🏥"],["NHS staff","Enough people on shift to cope","👩‍⚕️"],["Treasury","A bill that does not repeat every winter","💷"]]},
  rent_protests:{explainer:"Rents are set by the balance of housing supply and demand, shaped over years, not weeks. A cap changes prices immediately but can change landlords' decisions to let property at all; building more houses works on the supply side but takes years to show up.",control:"You can regulate rent rises or fund and streamline building. You cannot conjure homes into existence, and landlords can respond to regulation by leaving the market.",stakeholders:[["Renters","Rents they can afford now","🔑"],["Landlords","A viable return on their property","🏘️"],["Builders","Demand and permission to build","🏗️"],["Councils","Fewer people presenting as homeless","🏛️"]]},
  strike_wave:{explainer:"Public-sector pay disputes sit inside departmental budgets, inflation and comparability with other workers. Legislating a minimum service level changes the law rather than the dispute itself, and needs Parliament's consent like any other bill.",control:"You can fund a better offer or change the legal framework around strikes. You cannot force individual workers back into a job, and a service-level law still has to survive a Commons vote.",stakeholders:[["Striking staff","A pay offer that keeps pace with prices","✊"],["The public","Services that keep running","👥"],["Treasury","A settlement that does not spread to everyone else","💷"],["Your MPs","A law they are comfortable voting for","🏛️"]]},
  opposition_lead:{explainer:"Opinion polls are a snapshot, not a forecast, but MPs read them as a leading indicator of their own seat. A government's response to bad polling shapes party morale well before it shapes any actual vote.",control:"You can change policy, message or tone. You cannot make the opposition less effective, and voters can simply decide they have stopped listening.",stakeholders:[["Your MPs","Reassurance about their own seat","🏛️"],["Party strategists","A message that moves the numbers","📊"],["Opposition","Keep the momentum going","🔴"],["Voters","Something worth changing their mind for","🗳️"]]},
  inflation_spike:{explainer:"Inflation reflects global prices, domestic demand and the money supply together, and the Bank of England's independent rate-setting is only one lever among several. Government spending decisions can add to or offset the squeeze on households.",control:"You can subsidise households or intervene in specific prices. You cannot set interest rates, and price caps can suppress a symptom while leaving the underlying shortage in place.",stakeholders:[["Households","Prices that stop rising faster than wages","🛒"],["Bank of England","Room to bring inflation to target without political interference","🏦"],["Businesses","Predictable costs and demand","🏢"],["Treasury","A support package that does not itself add to inflation","💷"]]},
  crime_wave:{explainer:"Recorded crime, policing capacity and court backlogs move on different timescales: officers can be funded quickly, but recruits take months to train and courts take longer still to clear a backlog once sentencing gets tougher.",control:"You can fund policing and change sentencing guidance. You cannot instantly reverse a rise in an underlying behaviour, and tougher sentencing adds demand to a prison system that is already stretched.",stakeholders:[["Retailers and residents","Visible policing and consequences","🏪"],["Police","Enough officers and prosecutions that stick","👮"],["Courts","A caseload they can actually clear","⚖️"],["Treasury","Value for money on prevention versus enforcement","💷"]]},
  blackout_warning:{explainer:"Electricity supply has to match demand second by second; a system with little spare capacity is exposed whenever demand peaks and low-wind days cut generation at the same time. Building new capacity takes years; standby payments and imports are the short-term levers.",control:"You can pay generators to hold capacity in reserve, ask for voluntary demand reduction, or lean on interconnectors to import power. You cannot control the weather or guarantee another country's spare capacity is there when you need it.",stakeholders:[["Households and businesses","The lights staying on","💡"],["Grid operator","Enough margin to manage the peak safely","🔌"],["Treasury","Standby payments that do not become permanent","💷"],["Other countries","Reliable trade in electricity, not just in a crisis","🌍"]]},
  pre_election_giveaway:{explainer:"A pre-election Budget sits at the exact point where economic policy and campaign strategy overlap. Anything unveiled now becomes part of both the fiscal inheritance the next government has to manage and the record voters judge before polling day.",control:"You can choose the fiscal package, subject to Parliament. You cannot stop the opposition or the markets reading it as electioneering, whatever you call it.",stakeholders:[["Voters","Feel better off before they decide","🗳️"],["Markets","A package that looks sustainable, not just timed","📈"],["Treasury","Room to manage whatever comes after the election","💷"],["Opposition","Frame the package as a bribe","🔴"]]},
  manifesto_reckoning:{explainer:"A manifesto is a public promise assessed retrospectively, not a private target. How a government explains what it did and did not deliver becomes part of the electorate's judgement, independent of the numbers themselves.",control:"You can choose how to characterise the record. You cannot change what actually happened, and journalists compare the account you give against the manifesto text itself.",stakeholders:[["Voters","An honest account they can judge","🗳️"],["Party members","A record they can defend on the doorstep","🎗️"],["Media","A gap between the promise and the record to report","📰"],["Opposition","Evidence the manifesto was never serious","🔴"]]},
  honours_row:{explainer:"Honours are formally granted by the Crown but effectively decided through a process the Prime Minister controls, including a list of the government's own nominations. Independent vetting exists but does not stop every controversial name.",control:"You decide who is nominated, and you can change the process itself. You cannot stop journalists comparing the list against the register of donations.",stakeholders:[["Nominees","Recognition they feel they earned","🎖️"],["Donors and aides","See loyalty rewarded","🤝"],["Public","A system that looks like it rewards merit","👥"],["Media","A story about cronyism","📰"]]},
  trade_talks:{explainer:"Trade agreements trade market access for regulatory alignment: the other side's standards usually come with the deal. Negotiators can get close to an agreement long before political leaders decide whether to accept the final terms.",control:"You can accept, hold out for changes, or walk away. You cannot make the other side's negotiators offer better terms than they are willing to give.",stakeholders:[["Exporters","Better market access","🚢"],["Affected domestic industries","Protection from new competition","🏭"],["Consumers","Lower prices, more choice","🛒"],["Your MPs","A deal they can defend to constituents","🏛️"]]},
  nurses_dispute:{explainer:"Safe staffing levels and pay are legally and industrially distinct issues, even though both show up in the same ballot. Funding one does not automatically resolve the other, which is why disputes like this can run alongside a separate pay dispute rather than replacing it.",control:"You can fund staffing changes, offer payments, or route the issue through the independent pay review process. You cannot instantly train and recruit enough nurses to fill every gap.",stakeholders:[["Nurses","Safe staffing levels on every shift","🩺"],["Patients","Consistent, safe care","🧑‍🧑‍🧒"],["NHS trusts","Deliverable staffing rules","🏥"],["Treasury","A cost that does not recur indefinitely","💷"]]},
  default:{explainer:"Government decisions sit inside a system of institutions, budgets, laws and people with competing incentives. The visible choice is usually only the start of the process.",control:"As Prime Minister you set direction and coordinate government, but Parliament, ministers, courts, public bodies, markets and voters can all constrain what happens next.",stakeholders:[["Public","Results without excessive cost","👥"],["Treasury","Affordable policy","💷"],["Your party","Stay electable and united","🏛️"],["Delivery system","A policy that can actually be implemented","⚙️"]]}
};

const EXTERNAL_EVENTS=[
 {id:'eastern_europe_crisis',icon:'🌍',category:'International crisis',title:'WAR ESCALATES IN EUROPE',text:'A major European war intensifies overnight. Allies ask Britain for a larger military and financial commitment, while officials warn that escalation risks are rising.',adviser:'Foreign Secretary',avatar:'🌍',adviserText:'We can shape the response, Prime Minister. We cannot dictate the war.',choices:[{t:'Increase military support',s:'Back allies more strongly',e:{treasury:-5,power:3,approval:1},h:'BRITAIN STEPS UP MILITARY SUPPORT',d:'Government announces a larger package for European allies.',delay:{after:5,text:'The longer commitment begins to squeeze the defence budget.',e:{treasury:-3,power:1}}},{t:'Focus on diplomacy',s:'Push negotiations and sanctions',e:{power:2,approval:1,economy:-1},h:'PM PUSHES DIPLOMATIC TRACK',d:'Britain calls for coordinated pressure and renewed negotiations.'},{t:'Limit further involvement',s:'Protect resources at home',e:{treasury:3,power:-4,approval:-1},h:'BRITAIN HOLDS BACK FROM NEW COMMITMENT',d:'Allies express disappointment as Britain limits additional support.'}]},
 {id:'shipping_shock',icon:'🚢',category:'Global shock',title:'GLOBAL SHIPPING DISRUPTION',text:'A major international shipping route becomes unsafe. Freight and energy prices jump, and British retailers warn of higher prices within weeks.',adviser:'Business Secretary',avatar:'🚢',adviserText:'This arrived from outside government, but voters will still judge us on the consequences.',choices:[{t:'Temporary business support',s:'Cushion the shock',e:{treasury:-4,economy:3,approval:1},h:'TREASURY MOVES TO PROTECT SUPPLY CHAINS',d:'Temporary support announced for badly affected sectors.'},{t:'Coordinate international response',s:'Work with allies on security',e:{power:3,treasury:-2,economy:1},h:'BRITAIN JOINS INTERNATIONAL SHIPPING RESPONSE',d:'Government backs a coordinated effort to restore trade routes.'},{t:'Let markets adjust',s:'Avoid another bailout',e:{treasury:2,economy:-3,approval:-3},h:'MINISTERS RULE OUT SHIPPING BAILOUT',d:'Businesses warn that higher costs will reach consumers.'}]}
];
const WORLD_NEWS=["WORLD • Fighting in Europe puts new pressure on defence budgets and alliances","ECONOMY • Global oil prices rise after disruption to shipping routes","EUROPE • Leaders meet to discuss defence spending and energy security","MARKETS • Investors cut global growth forecasts after weak manufacturing data","CLIMATE • Extreme weather renews pressure for adaptation spending","TECH • New AI systems accelerate debate over jobs, copyright and regulation","SECURITY • Major cyberattack hits an infrastructure provider serving several countries","TRADE • Global shipping costs jump after disruption on a key trade route"];

addEvents(...EXTERNAL_EVENTS);

/* Late-term content. Turns 11-19 used to run dry — the original event
   library was front-loaded, so the second half of a term was mostly the
   funding card and whatever the neglect drift dredged up. These ten fill
   that stretch, several timed to compound trouble already on the board
   rather than announcing themselves out of nowhere. */
addEvents(
{
 id:"leadership_rumours", icon:"🗞️", category:"Politics", title:"LEADERSHIP RUMOURS",
 text:"Backbenchers are muttering about a reshuffle — or worse. Nobody will say on the record whether letters are going in, which is itself the story.",
 adviser:"Chief Whip", avatar:"🏛", adviserText:"This is not a leadership challenge yet, Prime Minister. It becomes one if you act like you're worried about it.",
 choices:[
  {t:"Reshuffle the Cabinet",s:"Show you've heard them",e:{power:2,approval:-1},h:"PM RESHUFFLES TO CALM THE PARTY",d:"New faces around the Cabinet table are meant to prove the message landed."},
  {t:"Face them down",s:"Refuse to blink",e:{power:-1,approval:2},h:"PM DARES CRITICS TO MAKE THEIR MOVE",d:"Downing Street refuses to blink, betting the rumours have no teeth.",delay:{after:3,text:"No challenge ever came — but the rumours cost you some authority anyway.",e:{power:-2}}},
  {t:"Make a concession to the rebels",s:"Buy peace with policy",e:{power:3,treasury:-3,approval:-1},h:"PM BUYS OFF THE PARTY'S REBELS",d:"A policy concession quiets the loudest critics, for now."}
 ]
},
{
 id:"winter_crisis", icon:"🥶", category:"Crisis", title:"WINTER CRISIS IN THE NHS",
 text:"Flu, cold homes and a wave of admissions push A&E waits to record levels. Hospitals across the country declare critical incidents.",
 adviser:"Health Secretary", avatar:"🏥", adviserText:"We can buy capacity for this winter, free up beds by cancelling other care, or spend the next month explaining why it isn't our fault.",
 choices:[
  {t:"Emergency funding",s:"Buy capacity now",e:{treasury:-6,britain:5,approval:2},h:"EMERGENCY WINTER FUNDING FOR THE NHS",d:"Extra beds and agency staff are funded at short notice.",delay:{after:4,text:"The extra winter capacity eases the worst of the pressure.",e:{britain:3}}},
  {t:"Cancel elective care",s:"Free up beds, lengthen other queues",e:{britain:2,approval:-3},h:"ROUTINE OPERATIONS CANCELLED TO EASE WINTER CRISIS",d:"Non-urgent surgery is paused to free up emergency capacity.",delay:{after:5,text:"The cancelled operations become next year's waiting list.",e:{britain:-3,approval:-2}}},
  {t:"Blame the previous government",s:"Free, unconvincing",e:{approval:-2,power:1},h:"PM BLAMES PREDECESSORS FOR WINTER CRISIS",d:"Ministers point to years of underinvestment. Voters seem unmoved."}
 ]
},
{
 id:"rent_protests", icon:"🏘️", category:"Housing", title:"RENT PROTESTS",
 text:"Renters march in a dozen cities as rents outpace wages for a third straight year. Landlord groups warn that any cap will only shrink supply further.",
 adviser:"Housing Secretary", avatar:"🏠", adviserText:"Cap rents and landlords start selling up. Do nothing and the marches get bigger.",
 choices:[
  {t:"Introduce rent controls",s:"Popular now, costs supply later",e:{housing:-4,approval:4},h:"GOVERNMENT CAPS RENT RISES",d:"Ministers impose a limit on annual rent increases.",delay:{after:5,text:"Landlords begin leaving the rental market, tightening supply further.",e:{housing:-3}}},
  {t:"Build faster instead",s:"Slower relief, costs money",e:{treasury:-4,housing:3},h:"PM BACKS BUILDING OVER RENT CONTROLS",d:"Government bets on supply rather than price limits.",delay:{after:6,text:"New homes begin easing the rental market.",e:{housing:3}}},
  {t:"Leave it to the market",s:"Free, and it shows",e:{approval:-3,housing:-1},h:"MINISTERS RULE OUT INTERVENTION ON RENTS",d:"Government declines to act as protests continue."}
 ]
},
{
 id:"strike_wave", icon:"✊", category:"Crisis", title:"STRIKE WAVE HITS PUBLIC SERVICES",
 text:"Council staff, driving examiners and immigration caseworkers join a coordinated strike wave. Waiting rooms and picket lines fill up together.",
 adviser:"Cabinet Secretary", avatar:"⚖", adviserText:"You can pay to settle, legislate to limit the disruption, or wait them out. None of it is free.",
 vote:true, bill:"Minimum Service Levels Bill",
 choices:[
  {t:"Settle",s:"Pay to end it",e:{treasury:-5,britain:4,approval:1},h:"GOVERNMENT SETTLES WITH STRIKING STAFF",d:"A pay deal ends the walkouts.",delay:{after:3,text:"Backlogs from the strike wave finally clear.",e:{britain:2}}},
  {t:"Legislate minimum service levels",s:"Force a floor, risk your own MPs",e:{approval:-2},h:"MINIMUM SERVICE LEVELS BILL INTRODUCED",d:"Ministers move to guarantee a floor of service during future strikes.",voteBoost:-4},
  {t:"Sit it out",s:"Free, and it shows",e:{britain:-4,approval:-2},h:"MINISTERS WAIT OUT THE STRIKE WAVE",d:"No new offer, no new law. The disruption continues.",delay:{after:3,text:"Public patience with the standoff wears thin.",e:{approval:-2}}}
 ]
},
{
 id:"opposition_lead", icon:"📉", category:"Politics", title:"OPPOSITION OPENS UP A LEAD",
 text:"A fresh poll puts the opposition ten points ahead for the first time this Parliament. Your backbenchers are reading the crosstabs, not the topline.",
 adviser:"Party Pollster", avatar:"📊", adviserText:"A ten-point gap this far out is not fatal. It is, however, extremely motivating for anyone thinking about their own seat.",
 choices:[
  {t:"Pivot to popular policies",s:"Chase the polling",e:{approval:3,power:-2},h:"DOWNING STREET CHASES THE POLLS",d:"Ministers are told to find announcements the public actually wants."},
  {t:"Hold course",s:"Steady as she goes",e:{power:2,approval:-1},h:"PM: NO CHANGE OF DIRECTION",d:"Downing Street insists the strategy is right and needs time."},
  {t:"Attack the opposition",s:"Go on the offensive",e:{power:2,approval:-2},h:"PM LAUNCHES ATTACK ON OPPOSITION RECORD",d:"Government shifts to a more combative message."}
 ]
},
{
 id:"inflation_spike", icon:"💹", category:"Economy", title:"INFLATION SPIKES AGAIN",
 text:"A surprise jump in the inflation figures wrongfoots the markets and reopens arguments about who should pay for it.",
 adviser:"The Chancellor", avatar:"£", adviserText:"The Bank sets rates. We set everything else, and voters will not care about the difference.",
 choices:[
  {t:"Let the Bank act",s:"Respect independence",e:{power:1,approval:-1},h:"PM LEAVES INFLATION TO THE BANK",d:"Downing Street declines to intervene, citing monetary independence."},
  {t:"Household support",s:"Cushion the blow",e:{treasury:-4,approval:3},h:"TREASURY UNVEILS COST-OF-LIVING SUPPORT",d:"New payments are announced for the households hit hardest."},
  {t:"Impose price caps",s:"Popular, distorting",e:{economy:-3,approval:2},h:"PM IMPOSES EMERGENCY PRICE CAPS",d:"Ministers cap prices on a range of essential goods.",delay:{after:4,text:"Price caps begin distorting supply as some goods grow harder to find.",e:{economy:-2}}}
 ]
},
{
 id:"crime_wave", icon:"🚨", category:"Crisis", title:"CRIME WAVE",
 text:"Shoplifting, phone theft and antisocial behaviour surge in town centres. Retailers say officers simply do not turn up any more.",
 adviser:"Home Secretary", avatar:"🛂", adviserText:"More officers, tougher courts or prevention on the ground — pick one and the other two get louder.",
 choices:[
  {t:"Fund more police",s:"Expensive, visible",e:{treasury:-5,britain:4},h:"THOUSANDS OF NEW OFFICERS FUNDED",d:"A recruitment drive is fast-tracked for town-centre policing.",delay:{after:5,text:"New officers begin reaching the street.",e:{britain:3}}},
  {t:"Toughen sentencing",s:"Popular, slower to bite",e:{approval:2,britain:1},h:"PM TOUGHENS SENTENCING FOR REPEAT OFFENDERS",d:"New guidance targets persistent offenders."},
  {t:"Fund community programmes",s:"Cheaper, long-term",e:{treasury:-2,britain:2},h:"MINISTERS BACK COMMUNITY CRIME PREVENTION",d:"Local prevention schemes get fresh funding."}
 ]
},
{
 id:"blackout_warning", icon:"🔌", category:"Energy", title:"BLACKOUT WARNING",
 text:"The grid operator warns of possible rolling blackouts this winter if demand peaks during a cold, still week with little wind generation.",
 adviser:"Energy Secretary", avatar:"⚡", adviserText:"We can pay generators to be on standby, ask people to use less, or buy more from abroad and hope the interconnectors hold.",
 choices:[
  {t:"Pay for standby capacity",s:"Expensive insurance",e:{treasury:-5,britain:4},h:"GOVERNMENT PAYS FOR EMERGENCY GRID CAPACITY",d:"Standby power plants are paid to stay ready.",delay:{after:3,text:"The paid-for capacity comes online just in time for the cold snap.",e:{britain:2}}},
  {t:"Ask for demand reduction",s:"Cheap, relies on the public",e:{britain:1,approval:-1},h:"HOUSEHOLDS ASKED TO CUT ENERGY USE",d:"A national appeal asks households to shift usage away from peak hours."},
  {t:"Import more power",s:"Quick, exposes Britain to prices abroad",e:{treasury:-2,britain:2,economy:-1},h:"BRITAIN LEANS ON INTERCONNECTORS TO KEEP THE LIGHTS ON",d:"Extra imports are secured at a premium price."}
 ]
},
{
 id:"pre_election_giveaway", icon:"🎁", category:"Budget", title:"THE PRE-ELECTION GIVEAWAY QUESTION",
 text:"With the election closing in, the Chancellor is under pressure to find something voters will actually notice before polling day.",
 adviser:"The Chancellor", avatar:"£", adviserText:"Whatever we announce now, the electorate has seen this film before. It rarely changes the ending.",
 choices:[
  {t:"Cut taxes",s:"Popular, expensive",e:{treasury:-6,approval:4},h:"PM ANNOUNCES PRE-ELECTION TAX CUT",d:"Opposition accuses the government of buying votes with its own money."},
  {t:"Spending splurge",s:"Popular, visible, expensive",e:{treasury:-7,approval:4,britain:2},h:"GOVERNMENT UNVEILS PRE-ELECTION SPENDING PACKAGE",d:"New money is announced across public services."},
  {t:"Resist",s:"Responsible, thankless",e:{treasury:3,approval:-2},h:"CHANCELLOR RESISTS PRE-ELECTION GIVEAWAY",d:"The Budget banks the headroom instead of spending it."}
 ]
},
{
 id:"manifesto_reckoning", icon:"📜", category:"Politics", title:"THE MANIFESTO RECKONING",
 text:"With the manifesto's promises about to be marked by the voters, the Party Chair wants a line prepared for every one you did not keep.",
 adviser:"Party Chair", avatar:"🗳", adviserText:"Voters forgive a promise you tried and missed. They do not forgive being told it was never really a promise at all.",
 choices:[
  {t:"Be honest about what you missed",s:"Costs approval, buys trust",e:{power:3,approval:-3},h:"PM OWNS UP TO BROKEN PROMISES",d:"A frank account of the manifesto's record is published ahead of the campaign."},
  {t:"Spin it",s:"35% chance it blows up",e:{approval:3},h:"DOWNING STREET RECASTS THE RECORD",d:"Ministers reframe missed pledges as changed circumstances.",
   risk:{chance:0.35,e:{approval:-5},h:"SPIN OVER BROKEN PROMISES BLOWS UP",d:"A journalist picks the reframing apart line by line, and it becomes the story instead."}},
  {t:"Change the subject",s:"Announce something else instead",e:{power:-1},h:"PM CHANGES THE SUBJECT",d:"A new announcement is timed to bury the question."}
 ]
}
);

/* Three more, deliberately generic and broadly windowed. An active player
   can clear the specific late-term crises above faster than their windows
   refill; these exist purely so the desk still has something real on it
   when that happens, not to carry a plot of their own. */
addEvents(
{
 id:"honours_row", icon:"🎖️", category:"Politics", title:"THE HONOURS LIST ROW",
 text:"A leaked draft of the next honours list rewards donors and aides alongside genuine public service. The commentariat calls it grubby; your MPs mostly call it Tuesday.",
 adviser:"Chief of Staff", avatar:"📱", adviserText:"Every list looks bad the week before it's published. Most of them are forgotten within a fortnight.",
 choices:[
  {t:"Defend the list",s:"Own the decisions",e:{power:1,approval:-2},h:"PM DEFENDS HONOURS LIST",d:"Downing Street stands by every name on the list."},
  {t:"Trim it quietly",s:"Remove the worst names",e:{approval:1,power:-1},h:"NAMES QUIETLY DROPPED FROM HONOURS LIST",d:"Officials confirm a handful of names have been removed after press inquiries."},
  {t:"Scrap political honours",s:"Bigger reform, bigger fight",e:{approval:2,power:-3},h:"PM MOVES TO REFORM THE HONOURS SYSTEM",d:"Government proposes ending the practice altogether, angering some of its own benches."}
 ]
},
{
 id:"trade_talks", icon:"🤝", category:"Economy", title:"TRADE TALKS REACH THE WIRE",
 text:"Negotiators say a trade agreement is close, but only if Britain accepts standards it has resisted for months. Business wants a deal; some of your MPs want a fight.",
 adviser:"Business Secretary", avatar:"🤖", adviserText:"No deal is free. The question is only which costs you are willing to accept, and which ones you are willing to be blamed for.",
 choices:[
  {t:"Accept the terms",s:"Deal now, complaints later",e:{economy:3,power:-2},h:"BRITAIN SIGNS TRADE DEAL",d:"Ministers accept the terms on offer to secure the agreement.",delay:{after:5,text:"The agreement begins showing up in trade figures.",e:{economy:2}}},
  {t:"Hold out for more",s:"Risk the whole deal",e:{power:2,economy:-1},h:"PM HOLDS OUT ON TRADE TERMS",d:"Britain declines to sign without further changes."},
  {t:"Walk away",s:"No deal, no compromise",e:{power:1,economy:-3},h:"TRADE TALKS COLLAPSE",d:"Negotiations end without an agreement."}
 ]
},
{
 id:"nurses_dispute", icon:"🩺", category:"Crisis", title:"NURSING STAFF DISPUTE",
 text:"Nursing unions ballot for industrial action over staffing ratios, separately from the wider pay dispute already running. Wards warn they cannot safely absorb another walkout.",
 adviser:"Health Secretary", avatar:"🏥", adviserText:"This is about staffing levels, not just pay. Money alone will not entirely fix it.",
 choices:[
  {t:"Fund safer staffing levels",s:"Address the real complaint",e:{treasury:-4,britain:4},h:"GOVERNMENT FUNDS NURSE STAFFING LEVELS",d:"Ministers commit money specifically to ward staffing ratios.",delay:{after:4,text:"Staffing ratios begin to improve on the wards worst affected.",e:{britain:2}}},
  {t:"Offer a one-off payment",s:"Cheaper, addresses pay not staffing",e:{treasury:-2,approval:1},h:"NURSES OFFERED ONE-OFF PAYMENT",d:"A lump-sum payment is offered in lieu of a staffing commitment."},
  {t:"Refer it to the pay review body",s:"Free, slow, safe",e:{approval:-2},h:"NURSING DISPUTE REFERRED TO PAY BODY",d:"Ministers decline to intervene directly, citing the independent process."}
 ]
}
);

function getBriefing(event){ return BRIEFINGS[event.id] || BRIEFINGS.default; }
function getEvent(id){ return EVENTS.find(e => e.id === id); }

/* Scheduling metadata. Kept separate from the written content so the copy above
   stays untouched. `topic` links an event to the pressure it moves, `promise` to
   the manifesto pledge it can deliver or break, and the turn window paces the term.
   `cost` is action points: a major intervention costs more of your term than a reaction. */
const EVENT_META = {
  nhs_strike:           {topic:'health',    promise:'nhs',     from:1,  to:12, cost:2},
  planning:             {topic:'housing',   promise:'housing', from:2,  to:14, cost:2},
  tax_gap:              {topic:'treasury',  promise:'tax',     from:3,  to:16, cost:2},
  rates:                {topic:'economy',   promise:'growth',  from:1,  to:16, cost:1},
  prisons:              {topic:'crime',     promise:'crime',   from:3,  to:17, cost:1},
  energy:               {topic:'energy',    promise:'climate', from:2,  to:16, cost:2},
  minister_scandal:     {topic:'party',     promise:null,      from:3,  to:19, cost:1},
  rail:                 {topic:'transport', promise:null,      from:4,  to:19, cost:1},
  migration:            {topic:'migration', promise:null,      from:4,  to:17, cost:2},
  schools:              {topic:'services',  promise:null,      from:3,  to:17, cost:1},
  defence:              {topic:'defence',   promise:null,      from:15, to:19, cost:1},
  local_elections:      {topic:'party',     promise:null,      from:6,  to:14, cost:1},
  flood:                {topic:'services',  promise:null,      from:14, to:19, cost:1},
  ai_jobs:              {topic:'economy',   promise:'growth',  from:14, to:19, cost:1},
  lords:                {topic:'party',     promise:null,      from:9,  to:19, cost:2},
  by_election:          {topic:'party',     promise:null,      from:15, to:19, cost:1},
  growth_budget:        {topic:'economy',   promise:'growth',  from:5,  to:17, cost:2},
  pmqs:                 {topic:'party',     promise:null,      from:1,  to:19, cost:1},
  /* Held back deliberately: with most of the library already open by the
     mid-term, these four are reserved for turn 18 onward so a desk that
     has otherwise been cleared out is never actually empty. */
  data_breach:          {topic:'services',  promise:null,      from:18, to:19, cost:1},
  final_budget:         {topic:'treasury',  promise:'tax',     from:16, to:19, cost:2},
  eastern_europe_crisis:{topic:'defence',   promise:null,      from:18, to:19, cost:2},
  shipping_shock:       {topic:'economy',   promise:null,      from:18, to:19, cost:1},
  leadership_rumours:   {topic:'party',     promise:null,      from:12, to:19, cost:1},
  winter_crisis:        {topic:'health',    promise:'nhs',     from:11, to:17, cost:2},
  rent_protests:        {topic:'housing',   promise:'housing', from:12, to:19, cost:1},
  strike_wave:          {topic:'services',  promise:null,      from:11, to:17, cost:2},
  opposition_lead:      {topic:'party',     promise:null,      from:13, to:19, cost:1},
  inflation_spike:      {topic:'economy',   promise:'growth',  from:11, to:16, cost:1},
  crime_wave:           {topic:'crime',     promise:'crime',   from:12, to:19, cost:1},
  blackout_warning:     {topic:'energy',    promise:'climate', from:12, to:19, cost:1},
  pre_election_giveaway:{topic:'treasury',  promise:'tax',     from:17, to:19, cost:2},
  manifesto_reckoning:  {topic:'party',     promise:null,      from:16, to:19, cost:1},
  honours_row:          {topic:'party',     promise:null,      from:9,  to:19, cost:1},
  trade_talks:          {topic:'economy',   promise:'growth',  from:9,  to:19, cost:1},
  nurses_dispute:       {topic:'health',    promise:'nhs',     from:9,  to:19, cost:1},
  election:             {topic:'final',     promise:null,      from:20, to:20, cost:0}
};

/* The manifesto pledges a player picks three of at the start. */
const PROMISES = [
  ['nhs',    '🏥','Cut NHS waiting lists'],
  ['housing','🏠','Build more homes'],
  ['growth', '📈','Grow the economy'],
  ['tax',    '💷','Keep taxes down'],
  ['crime',  '🚔','Cut crime'],
  ['climate','⚡','Secure clean energy']
];
