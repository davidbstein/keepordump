
function is_defined(e){
  return e !== undefined && e !== null && !isNaN(e);
}

function _stringify_arr(a){
  if (!a) return ',';
  return a.filter(is_defined).join(',') + ',';
}

function _stringify_2darr(a) {
  const to_ret = []
  for (let i = 0; i<a.length; i++)
    to_ret.push(_stringify_arr(a[i]));
  return to_ret.join(';') + ';';
}

function _parse_arr(a){
  const to_ret = a.split(',').map((e)=>parseInt(e)).slice(0,-1).filter(is_defined);
  return to_ret;
}

function _parse_2darr(a) {
  const rows = a.split(';');
  return rows.map(_parse_arr).slice(0,-1);
}

function _get_type(elem) {
  if (typeof(elem) !== "object") return "val";
  const type_ = elem.reduce((prev, e) => {return (typeof(e) === "object") ? "2darr": prev}, "arr");
  return type_;
}

function _stringify(s) {
  to_ret = []
  for (var k in s){
    if (s[k] == undefined) continue;
    to_ret.push(k)
    const type_ = _get_type(s[k])
    if (type_ === "val")
      to_ret.push(s[k]);
    if (type_ === "arr")
      to_ret.push(_stringify_arr(s[k]));
    if (type_ === "2darr")
      to_ret.push(_stringify_2darr(s[k]));
  }
  return to_ret.join('');
}


function _parse(v) {
  return Array.from(v.matchAll("([a-z_]+)([0-9,;]+)")).reduce(
    (to_ret, match) => {
      if (match[2].indexOf(';') >= 0) {
        to_ret[match[1]] = _parse_2darr(match[2]);
      } else if (match[2].indexOf(',') >= 0)
        to_ret[match[1]] = _parse_arr(match[2]);
      else
        to_ret[match[1]] = parseInt(match[2])
      return to_ret;
    }, {}
  );
}

function _testEncoding(obj){
  console.log("TEST COMPRESSIONS", JSON.stringify(obj));
  const compressed = _stringify(obj);
  console.log(compressed);
  console.log(JSON.stringify(obj));
  console.log(JSON.stringify(_parse(compressed)));
  console.log("TESTING DONE")
}

//_testEncoding({a:[8,7,7], b:23, c: [[1,2,3], [4,5,6]], d: undefined, e:[,,[1]]});
//_testEncoding({e:[,,[1]]});

function getState() {
  try {
    const hash = window.location.hash.slice(1);
    return _parse(hash);
  } catch (e) {
    console.error(e);
    return {}
  }
}

function saveState(s) {
  const hash = _stringify(s);
  console.log(hash);
  window.location.hash = hash;
}

function resetGame(){
  saveState({});
  runGame();
}

function get_topics(){
  const {burned_t = []} = getState();
  const topics = _ANSWER_KEY.map((e)=>e.topic);
  console.log("burned", burned_t);
  return topics.map((topic, idx) => ({burned: burned_t.indexOf(idx) >= 0, ...topic}))
}

function get_questions(topicIdx){
  const {burned_q = []} = getState();
  const topic = _ANSWER_KEY[topicIdx];
  const burned = burned_q[topicIdx] || []
  return topic.questions.map((question, idx) => ({burned: burned.indexOf(idx) >= 0, ...question}));
}

function get_board() {
  const {t: topicIdx, q: questionIdx, dropped=[]} = getState();
  const options = _ANSWER_KEY[topicIdx].options;
  return options.map((opt, idx) => ({dropped: (dropped.indexOf(idx) >= 0), ...opt}))
}

function blank_board() {
  const {dropped=[]} = getState();
  return Array.from(Array(15).keys()).map((e, idx)=> ({dropped: (dropped.indexOf(idx) >= 0), text:""}))
}

function pickTopic(topicIdx) {
  console.log(`PICKING TOPIC: ${topicIdx}`)
  state = getState();
  state.t = topicIdx;
  state.q = undefined;
  saveState(state);
  runGame();
}

function pickQuestion(questionIdx){
  console.log(`PICKING QUESTION: ${questionIdx}`)
  state = getState();
  state.q = questionIdx;
  saveState(state);
  runGame();
}

function closeTopic(){
  console.log(`CLOSING TOPIC`)
  state = getState();
  state.burned_t = state.burned_t || []
  state.burned_t.push(state.t);
  state.t = undefined;
  state.q = undefined;
  saveState(state);
  runGame();
}

function pickKeepOrDrop(keep_or_drop){
  console.log(`PICKING KEEP OR DROP: ${keep_or_drop}`)
  const state = getState();
  const {t: topicIdx, q: questionIdx, dropped=[]} = state
  const answers = _ANSWER_KEY[topicIdx].questions[questionIdx].answers;
  to_drop = [];
  for (let idx in answers) {
    if (dropped.indexOf(parseInt(idx)) >= 0) to_drop.push(idx);
    else if (answers[idx] === 'no' && keep_or_drop) to_drop.push(idx);
    else if (answers[idx] === 'yes' && !keep_or_drop) to_drop.push(idx);
  }
  state.dropped = to_drop;
  state.q = undefined;
  saveState(state);
  burnQuestion(topicIdx, questionIdx);
  incrementRound();
  if (state?.dropped?.length == 15) {
    alert("out of options. game over. There's a reset button at the bottom.");
  }
  runGame();
}

function burnCurrentQuestion() {
  console.log(`PICKING KEEP OR DROP: ${keep_or_drop}`)
  const state = getState();
  const {t: topicIdx, q: questionIdx, dropped=[]} = state
  burnQuestion(topicIdx, questionIdx);
  incrementBurnCounter();
  pickTopic(topicIdx);
}

function incrementRound() {
  const state = getState();
  state.round = state.round || 1;
  state.round++;
  saveState(state);
}


function incrementBurnCounter() {
  const state = getState();
  state.burn_count = state.burn_count || 0;
  state.burn_count++;
  saveState(state);
}

function burnQuestion(topicIdx, questionIdx) {
  console.log(`burning ${topicIdx} ${questionIdx}`);
  const state = getState();
  if (!state.burned_q) state.burned_q = [];
  if (!state.burned_q[topicIdx]) state.burned_q[topicIdx] = [];
  state.burned_q[topicIdx].push(questionIdx);
  saveState(state);
}



/**
 * ----------------------------------
 *          RENDER LOGIC
 * ----------------------------------
 */



function draw_action(action) {
  const to_draw = [
    `<div id="action_instruction"> ${action} </div>`
  ]
  document.querySelector("#game").innerHTML += to_draw.join('');
}

function reset_screen(){
  const round = getState().round || 1;
  const burn_count = getState().burn_count || 0;
  const dropped_count = (getState().dropped || []).length;
  document.querySelector("#game").innerHTML = `<div id="round">round ${round}${burn_count ? `\n${burn_count} burned question${burn_count>1?'s':''}` : ''}</div>`;
}

function draw_board(board){
  const to_draw = [
    `<div id="board">`,
    ...board.map(({dropped, text, url}, idx) => {
      return `<div class='${dropped?'dropped':''} board_opt ${url?'has-image':''}' style="background-image: url('${url}')"><div>${text}</div></div>`
    }),
    ...[`</div>`]
  ]
  document.querySelector("#game").innerHTML += to_draw.join('');
  return board.map(({dropped, text, url}) => dropped ? "[dropped]" : `${text}(${url})`)
}

function draw_pick_topic(topics){
  const to_draw = [
    `<div id="pick_topic" class="action-container">`,
    ...topics.map(({burned, text, url}, idx) => {
      if (burned) return `<div class='burned topic_opt'>${text}</div>`
      return `<div class='topic_opt ${url ? 'has-image' :''}' style="background-image: url('${url}')" onclick="pickTopic(${idx});"><div>${text}</div></div>`
    }),
    ...[`</div>`]
  ]
  document.querySelector("#game").innerHTML += to_draw.join('');
}

function draw_pick_question(questions){
  const to_draw = [
    `<div id="pick_question" class="action-container">`,
    ...questions.map(({burned, text, url}, idx) => {
      if (burned) return `<div class='burned question_opt' style="background-image: url('${url}')"><div>Question ${idx+1}</div></div>`
      return `<div class='question_opt' style="background-image: url('${url}')" onclick="pickQuestion(${idx});"><div>Question ${idx+1}</div></div>`
    }),
    ...[`</div>`],
    ...[`<div id='controls'><div class='return-button' onclick="closeTopic()"> return to topic selection </div></div>`]
  ]
  document.querySelector("#game").innerHTML += to_draw.join('');

}

function draw_keep_or_drop(question){
  const to_draw = [
    `<div id="keep_or_drop" class="action-container">`,
      `<div id='keep-question'>${question.text}</div>`,
      `<div id='keep-choice'>`,
        `<div id='keep-button' class='KoD-button' onclick='pickKeepOrDrop(true);'>keep</div>`,
        `<div id='drop-button' class='KoD-button' onclick='pickKeepOrDrop(false);'>drop</div>`,
        `<div id='burn-button'> <div class='KoD-button' onclick='burnCurrentQuestion();'>burn question</div></div>`,
      `</div>`,

    `</div>`
  ]
  document.querySelector("#game").innerHTML += to_draw.join('');
}


/**
 * ----------------------------------
 *             GAME LOGIC
 * ----------------------------------
 */
function runGame(){
  window.setTimeout(_runGame, 0);
}

function _runGame() {
  const state = getState();
  reset_screen();
  const {t, q, burned_q, burned_t, dropped, round} = getState();
  if (!is_defined(t)) {
    draw_action("pick a topic");
    draw_pick_topic(get_topics());
    draw_board(blank_board());
    return;
  }
  if (!is_defined(q)) {
    draw_action("pick a question");
    const questions = get_questions(t);
    if (questions.filter((q)=>{return !q.burned}).length == 0) {
      closeTopic();
      return
    }
    draw_pick_question(questions);
    draw_board(get_board());
    return;
  }

  draw_action("keep or drop?");
  draw_keep_or_drop(get_questions(t)[q]);
  draw_board(get_board());
}

function testGame(){
  resetGame();
  pickTopic(2);
  pickQuestion(2);
  pickKeepOrDrop(true);
  runGame();
}
