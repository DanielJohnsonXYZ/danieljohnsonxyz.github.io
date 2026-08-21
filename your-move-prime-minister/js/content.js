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
  {t:"Reject the amendments",s:"Fight the Lords",e:{power:2,approval:1},h:"COMMONS-LORDS SHOWDOWN",d:"Government sends the bill back unchanged.",voteBoost:-2},
  {t:"Accept most changes",s:"Compromise",e:{power:1,britain:2},h:"PM CUTS DEAL WITH LORDS",d:"Ministers accept safeguards to secure the legislation.",voteBoost:7},
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
  default:{explainer:"Government decisions sit inside a system of institutions, budgets, laws and people with competing incentives. The visible choice is usually only the start of the process.",control:"As Prime Minister you set direction and coordinate government, but Parliament, ministers, courts, public bodies, markets and voters can all constrain what happens next.",stakeholders:[["Public","Results without excessive cost","👥"],["Treasury","Affordable policy","💷"],["Your party","Stay electable and united","🏛️"],["Delivery system","A policy that can actually be implemented","⚙️"]]}
};

const EXTERNAL_EVENTS=[
 {id:'eastern_europe_crisis',icon:'🌍',category:'International crisis',title:'WAR ESCALATES IN EUROPE',text:'A major European war intensifies overnight. Allies ask Britain for a larger military and financial commitment, while officials warn that escalation risks are rising.',adviser:'Foreign Secretary',avatar:'🌍',adviserText:'We can shape the response, Prime Minister. We cannot dictate the war.',choices:[{t:'Increase military support',s:'Back allies more strongly',e:{treasury:-5,power:3,approval:1},h:'BRITAIN STEPS UP MILITARY SUPPORT',d:'Government announces a larger package for European allies.',delay:{after:5,text:'The longer commitment begins to squeeze the defence budget.',e:{treasury:-3,power:1}}},{t:'Focus on diplomacy',s:'Push negotiations and sanctions',e:{power:2,approval:1,economy:-1},h:'PM PUSHES DIPLOMATIC TRACK',d:'Britain calls for coordinated pressure and renewed negotiations.'},{t:'Limit further involvement',s:'Protect resources at home',e:{treasury:3,power:-4,approval:-1},h:'BRITAIN HOLDS BACK FROM NEW COMMITMENT',d:'Allies express disappointment as Britain limits additional support.'}]},
 {id:'shipping_shock',icon:'🚢',category:'Global shock',title:'GLOBAL SHIPPING DISRUPTION',text:'A major international shipping route becomes unsafe. Freight and energy prices jump, and British retailers warn of higher prices within weeks.',adviser:'Business Secretary',avatar:'🚢',adviserText:'This arrived from outside government, but voters will still judge us on the consequences.',choices:[{t:'Temporary business support',s:'Cushion the shock',e:{treasury:-4,economy:3,approval:1},h:'TREASURY MOVES TO PROTECT SUPPLY CHAINS',d:'Temporary support announced for badly affected sectors.'},{t:'Coordinate international response',s:'Work with allies on security',e:{power:3,treasury:-2,economy:1},h:'BRITAIN JOINS INTERNATIONAL SHIPPING RESPONSE',d:'Government backs a coordinated effort to restore trade routes.'},{t:'Let markets adjust',s:'Avoid another bailout',e:{treasury:2,economy:-3,approval:-3},h:'MINISTERS RULE OUT SHIPPING BAILOUT',d:'Businesses warn that higher costs will reach consumers.'}]}
];
const WORLD_NEWS=["WORLD • Fighting in Europe puts new pressure on defence budgets and alliances","ECONOMY • Global oil prices rise after disruption to shipping routes","EUROPE • Leaders meet to discuss defence spending and energy security","MARKETS • Investors cut global growth forecasts after weak manufacturing data","CLIMATE • Extreme weather renews pressure for adaptation spending","TECH • New AI systems accelerate debate over jobs, copyright and regulation","SECURITY • Major cyberattack hits an infrastructure provider serving several countries","TRADE • Global shipping costs jump after disruption on a key trade route"];

addEvents(...EXTERNAL_EVENTS);

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
  minister_scandal:     {topic:'party',     promise:null,      from:3,  to:18, cost:1},
  rail:                 {topic:'transport', promise:null,      from:4,  to:17, cost:1},
  migration:            {topic:'migration', promise:null,      from:4,  to:17, cost:2},
  schools:              {topic:'services',  promise:null,      from:3,  to:17, cost:1},
  defence:              {topic:'defence',   promise:null,      from:4,  to:18, cost:1},
  local_elections:      {topic:'party',     promise:null,      from:6,  to:14, cost:1},
  flood:                {topic:'services',  promise:null,      from:4,  to:18, cost:1},
  ai_jobs:              {topic:'economy',   promise:'growth',  from:6,  to:18, cost:1},
  lords:                {topic:'party',     promise:null,      from:7,  to:18, cost:2},
  by_election:          {topic:'party',     promise:null,      from:8,  to:17, cost:1},
  growth_budget:        {topic:'economy',   promise:'growth',  from:5,  to:17, cost:2},
  pmqs:                 {topic:'party',     promise:null,      from:1,  to:18, cost:1},
  data_breach:          {topic:'services',  promise:null,      from:5,  to:18, cost:1},
  final_budget:         {topic:'treasury',  promise:'tax',     from:16, to:19, cost:2},
  eastern_europe_crisis:{topic:'defence',   promise:null,      from:5,  to:18, cost:2},
  shipping_shock:       {topic:'economy',   promise:null,      from:6,  to:18, cost:1},
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
