// script.js (配對題順序打亂版本)
// ======================== 全域變數與資料結構 ========================
let questionBank = [];
let wrongQuestions = [];
let weakQuestions = [];

let currentQuizQuestions = [];
let currentIndex = 0;
let userAnswers = [];
let answerTimes = [];
let quizStartTime = null;
let quizTimer = null;
let currentQuestionObj = null;
let quizActive = false;
let selectedOptionLock = false;
let currentMultiSelected = [];
let currentMatchingState = null;

// DOM 元素
const managerSection = document.getElementById('managerSection');
const examSection = document.getElementById('examSection');
const reviewSection = document.getElementById('reviewSection');
const navBtns = document.querySelectorAll('.nav-btn');
const questionBankListDiv = document.getElementById('questionBankList');
const saveQuestionBtn = document.getElementById('saveQuestionBtn');
const newQuestionText = document.getElementById('newQuestionText');
const newQuestionType = document.getElementById('newQuestionType');
const dynamicOptionsDiv = document.getElementById('dynamicOptions');
const addOptionBtn = document.getElementById('addOptionBtn');
const newAnswerInput = document.getElementById('newAnswer');
const wrongListDiv = document.getElementById('wrongQuestionsList');
const weakListDiv = document.getElementById('weakQuestionsList');
const wrongCountBadge = document.getElementById('wrongCountBadge');
const weakCountBadge = document.getElementById('weakCountBadge');
const practiceWrongBtn = document.getElementById('practiceWrongBtn');
const practiceWeakBtn = document.getElementById('practiceWeakBtn');

let editingId = null;

// 配對題編輯專用變數
let matchingLeftItems = [];
let matchingRightBoxes = [];

// ======================== LocalStorage 操作 ========================
function loadData() {
    const storedBank = localStorage.getItem('questionBank');
    if (storedBank) {
        questionBank = JSON.parse(storedBank);
    } else {
        questionBank = [
            { id: Date.now().toString() + '1', question: 'JavaScript 是靜態語言嗎？', type: 'true_false', options: ['是', '非'], answer: '非', createdAt: new Date().toISOString() },
            { id: Date.now().toString() + '2', question: '下列哪個是 CSS 框架？', type: 'single', options: ['React', 'Vue', 'Tailwind', 'Angular'], answer: 'Tailwind', createdAt: new Date().toISOString() },
            { id: Date.now().toString() + '3', question: 'localStorage 儲存的資料何時會過期？', type: 'single', options: ['瀏覽器關閉', '永遠存在(除非清除)', '30分鐘', '每天'], answer: '永遠存在(除非清除)', createdAt: new Date().toISOString() }
        ];
        saveQuestionBank();
    }
    const storedWrong = localStorage.getItem('wrongQuestions');
    wrongQuestions = storedWrong ? JSON.parse(storedWrong) : [];
    const storedWeak = localStorage.getItem('weakQuestions');
    weakQuestions = storedWeak ? JSON.parse(storedWeak) : [];

    renderQuestionBank();
    renderReviewLists();
}

function saveQuestionBank() {
    localStorage.setItem('questionBank', JSON.stringify(questionBank));
}

function saveWrongQuestions() {
    localStorage.setItem('wrongQuestions', JSON.stringify(wrongQuestions));
}

function saveWeakQuestions() {
    localStorage.setItem('weakQuestions', JSON.stringify(weakQuestions));
}

function syncAllStorage() {
    saveQuestionBank();
    saveWrongQuestions();
    saveWeakQuestions();
}

// ======================== 動態選項 UI ========================
function renderDynamicOptions() {
    const type = newQuestionType.value;
    dynamicOptionsDiv.innerHTML = '';

    if (type === 'true_false') {
        addOptionBtn.style.display = 'none';
        newAnswerInput.style.display = 'none';
        newAnswerInput.value = '';

        const btnGroup = document.createElement('div');
        btnGroup.className = 'tf-buttons';
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '1rem';
        btnGroup.style.marginBottom = '1rem';

        const trueBtn = document.createElement('button');
        trueBtn.type = 'button';
        trueBtn.textContent = '✅ 是';
        trueBtn.className = 'tf-option';
        trueBtn.style.flex = '1';
        trueBtn.style.padding = '0.6rem';
        trueBtn.style.borderRadius = '40px';
        trueBtn.style.border = '1px solid #cbd5e1';
        trueBtn.style.background = '#f8fafc';
        trueBtn.style.cursor = 'pointer';

        const falseBtn = document.createElement('button');
        falseBtn.type = 'button';
        falseBtn.textContent = '❌ 非';
        falseBtn.className = 'tf-option';
        falseBtn.style.flex = '1';
        falseBtn.style.padding = '0.6rem';
        falseBtn.style.borderRadius = '40px';
        falseBtn.style.border = '1px solid #cbd5e1';
        falseBtn.style.background = '#f8fafc';
        falseBtn.style.cursor = 'pointer';

        const setAnswer = (value) => {
            newAnswerInput.value = value;
            document.querySelectorAll('.tf-option').forEach(btn => {
                btn.style.background = '#f8fafc';
                btn.style.borderColor = '#cbd5e1';
            });
            if (value === '是') trueBtn.style.background = '#d1fae5', trueBtn.style.borderColor = '#10b981';
            else falseBtn.style.background = '#fee2e2', falseBtn.style.borderColor = '#ef4444';
        };

        trueBtn.onclick = () => setAnswer('是');
        falseBtn.onclick = () => setAnswer('非');

        btnGroup.appendChild(trueBtn);
        btnGroup.appendChild(falseBtn);
        dynamicOptionsDiv.appendChild(btnGroup);
    } 
    else if (type === 'multi') {
        addOptionBtn.style.display = 'inline-block';
        newAnswerInput.style.display = 'block';
        newAnswerInput.placeholder = '點選「標記為正確答案」可複選';
        newAnswerInput.readOnly = true;
        for (let i = 0; i < 4; i++) {
            addMultiOptionInput('');
        }
    }
    else if (type === 'matching') {
        addOptionBtn.style.display = 'none';
        newAnswerInput.style.display = 'block';
        newAnswerInput.placeholder = '配對設定將自動產生';
        newAnswerInput.readOnly = true;
        // 載入編輯中的資料
        if (editingId) {
            const q = questionBank.find(qq => qq.id === editingId);
            if (q && q.type === 'matching') {
                matchingLeftItems = JSON.parse(JSON.stringify(q.matchingLeftItems || []));
                matchingRightBoxes = JSON.parse(JSON.stringify(q.matchingRightBoxes || []));
                // 確保每個 left item 都有 matchTo 屬性
                matchingLeftItems.forEach(item => {
                    if (!item.matchTo) item.matchTo = null;
                });
            } else {
                resetMatchingData();
            }
        } else {
            resetMatchingData();
        }
        renderMatchingEditorUI();
    }
    else { // single
        addOptionBtn.style.display = 'inline-block';
        newAnswerInput.style.display = 'block';
        newAnswerInput.placeholder = '點選下方「設為答案」按鈕';
        newAnswerInput.readOnly = true;
        for (let i = 0; i < 4; i++) {
            addSingleOptionInput('');
        }
    }
}

function resetMatchingData() {
    if (matchingLeftItems.length === 0) {
        matchingLeftItems = [{ id: 'l1', text: '範例案例 1', matchTo: 'r1' }];
        matchingRightBoxes = [{ id: 'r1', label: '分類 A' }];
    }
}

function renderMatchingEditorUI() {
    dynamicOptionsDiv.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <strong>左側案例清單</strong>
            <div id="matchingLeftList" style="margin: 0.5rem 0;"></div>
            <button type="button" id="addLeftItemBtn" class="small-btn">+ 新增案例</button>
        </div>
        <div>
            <strong>右側配對框</strong>
            <div id="matchingRightList" style="margin: 0.5rem 0;"></div>
            <button type="button" id="addRightBoxBtn" class="small-btn">+ 新增配對框</button>
        </div>
        <div style="margin-top: 1rem; font-size:0.85rem; color:#555;">💡 每個案例需配對到一個右側框，儲存時會自動記錄配對關係。</div>
    `;
    refreshMatchingEditorLists();
    document.getElementById('addLeftItemBtn')?.addEventListener('click', () => {
        const newId = 'l' + Date.now() + Math.random();
        matchingLeftItems.push({ id: newId, text: '新案例', matchTo: matchingRightBoxes[0]?.id || null });
        refreshMatchingEditorLists();
        updateMatchingAnswerField();
    });
    document.getElementById('addRightBoxBtn')?.addEventListener('click', () => {
        const newId = 'r' + Date.now() + Math.random();
        matchingRightBoxes.push({ id: newId, label: '新分類' });
        refreshMatchingEditorLists();
        updateMatchingAnswerField();
    });
}

function refreshMatchingEditorLists() {
    const leftContainer = document.getElementById('matchingLeftList');
    const rightContainer = document.getElementById('matchingRightList');
    if (!leftContainer || !rightContainer) return;
    
    leftContainer.innerHTML = '';
    matchingLeftItems.forEach((item, idx) => {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '0.8rem';
        wrapper.style.border = '1px solid #e2e8f0';
        wrapper.style.borderRadius = '16px';
        wrapper.style.padding = '0.5rem';
        
        const topRow = document.createElement('div');
        topRow.className = 'option-input-row';
        const input = document.createElement('input');
        input.value = item.text;
        input.placeholder = `案例 ${idx+1}`;
        input.style.flex = '2';
        input.addEventListener('change', (e) => { 
            item.text = e.target.value;
            updateMatchingAnswerField();
        });
        const removeBtn = document.createElement('button');
        removeBtn.innerText = '✖';
        removeBtn.className = 'remove-option';
        removeBtn.onclick = () => {
            matchingLeftItems.splice(idx, 1);
            refreshMatchingEditorLists();
            updateMatchingAnswerField();
        };
        topRow.appendChild(input);
        topRow.appendChild(removeBtn);
        wrapper.appendChild(topRow);
        
        const selectRow = document.createElement('div');
        selectRow.style.marginTop = '0.4rem';
        selectRow.style.display = 'flex';
        selectRow.style.alignItems = 'center';
        selectRow.style.gap = '0.5rem';
        const labelSpan = document.createElement('span');
        labelSpan.innerText = '配對到：';
        labelSpan.style.fontSize = '0.8rem';
        const select = document.createElement('select');
        select.style.flex = '1';
        matchingRightBoxes.forEach((box, bi) => {
            const opt = document.createElement('option');
            opt.value = box.id;
            opt.innerText = box.label;
            select.appendChild(opt);
        });
        if (!item.matchTo || !matchingRightBoxes.some(b => b.id === item.matchTo)) {
            item.matchTo = matchingRightBoxes[0]?.id || '';
        }
        select.value = item.matchTo;
        select.addEventListener('change', (e) => {
            item.matchTo = e.target.value;
            updateMatchingAnswerField();
        });
        selectRow.appendChild(labelSpan);
        selectRow.appendChild(select);
        wrapper.appendChild(selectRow);
        leftContainer.appendChild(wrapper);
    });
    
    rightContainer.innerHTML = '';
    matchingRightBoxes.forEach((box, idx) => {
        const div = document.createElement('div');
        div.className = 'option-input-row';
        div.style.marginBottom = '0.5rem';
        const input = document.createElement('input');
        input.value = box.label;
        input.placeholder = `分類 ${idx+1}`;
        input.style.flex = '2';
        input.addEventListener('change', (e) => {
            box.label = e.target.value;
            refreshMatchingEditorLists(); // 重新刷新以更新下拉選單文字
            updateMatchingAnswerField();
        });
        const removeBtn = document.createElement('button');
        removeBtn.innerText = '✖';
        removeBtn.className = 'remove-option';
        removeBtn.onclick = () => {
            matchingRightBoxes.splice(idx, 1);
            // 將已配對此框的案例重置 matchTo
            matchingLeftItems.forEach(item => {
                if (item.matchTo === box.id) item.matchTo = matchingRightBoxes[0]?.id || null;
            });
            refreshMatchingEditorLists();
            updateMatchingAnswerField();
        };
        div.appendChild(input);
        div.appendChild(removeBtn);
        rightContainer.appendChild(div);
    });
    updateMatchingAnswerField();
}

function updateMatchingAnswerField() {
    const answerObj = {
        leftItems: matchingLeftItems,
        rightBoxes: matchingRightBoxes,
        matches: Object.fromEntries(matchingLeftItems.map(item => [item.id, item.matchTo]))
    };
    newAnswerInput.value = JSON.stringify(answerObj);
}

// 單選題選項列
function addSingleOptionInput(value = '') {
    const div = document.createElement('div');
    div.className = 'option-input-row';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '0.5rem';
    div.style.marginBottom = '0.5rem';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = `選項 ${dynamicOptionsDiv.children.length + 1}`;
    input.style.flex = '2';

    const setAnswerBtn = document.createElement('button');
    setAnswerBtn.textContent = '⭐ 設為答案';
    setAnswerBtn.className = 'set-answer-btn';
    setAnswerBtn.style.padding = '0.3rem 0.8rem';
    setAnswerBtn.style.borderRadius = '40px';
    setAnswerBtn.style.border = '1px solid #cbd5e1';
    setAnswerBtn.style.background = '#f1f5f9';
    setAnswerBtn.style.cursor = 'pointer';
    setAnswerBtn.style.fontSize = '0.8rem';

    setAnswerBtn.onclick = () => {
        document.querySelectorAll('.set-answer-btn').forEach(btn => {
            btn.style.background = '#f1f5f9';
            btn.style.borderColor = '#cbd5e1';
        });
        setAnswerBtn.style.background = '#d1fae5';
        setAnswerBtn.style.borderColor = '#10b981';
        const optionText = input.value.trim();
        if (optionText === '') {
            alert('請先輸入選項文字再設為答案');
            setAnswerBtn.style.background = '#f1f5f9';
            setAnswerBtn.style.borderColor = '#cbd5e1';
            return;
        }
        newAnswerInput.value = optionText;
    };

    const removeBtn = document.createElement('button');
    removeBtn.innerText = '✖';
    removeBtn.className = 'remove-option';
    removeBtn.style.width = '32px';
    removeBtn.style.height = '32px';
    removeBtn.style.borderRadius = '30px';
    removeBtn.style.border = 'none';
    removeBtn.style.background = '#f1f5f9';
    removeBtn.style.cursor = 'pointer';
    removeBtn.onclick = () => div.remove();

    div.appendChild(input);
    div.appendChild(setAnswerBtn);
    div.appendChild(removeBtn);
    dynamicOptionsDiv.appendChild(div);
}

// 複選題選項列
function addMultiOptionInput(value = '') {
    const div = document.createElement('div');
    div.className = 'option-input-row';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '0.5rem';
    div.style.marginBottom = '0.5rem';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = `選項 ${dynamicOptionsDiv.children.length + 1}`;
    input.style.flex = '2';

    const markCorrectBtn = document.createElement('button');
    markCorrectBtn.textContent = '⭐ 標記為正確答案';
    markCorrectBtn.className = 'multi-correct-btn';
    markCorrectBtn.style.padding = '0.3rem 0.8rem';
    markCorrectBtn.style.borderRadius = '40px';
    markCorrectBtn.style.border = '1px solid #cbd5e1';
    markCorrectBtn.style.background = '#f1f5f9';
    markCorrectBtn.style.cursor = 'pointer';
    markCorrectBtn.style.fontSize = '0.8rem';

    markCorrectBtn.onclick = () => {
        const optionText = input.value.trim();
        if (optionText === '') {
            alert('請先輸入選項文字再標記為正確答案');
            return;
        }
        if (markCorrectBtn.classList.contains('selected')) {
            markCorrectBtn.classList.remove('selected');
            markCorrectBtn.style.background = '#f1f5f9';
            markCorrectBtn.style.borderColor = '#cbd5e1';
        } else {
            markCorrectBtn.classList.add('selected');
            markCorrectBtn.style.background = '#d1fae5';
            markCorrectBtn.style.borderColor = '#10b981';
        }
        updateMultiAnswerDisplay();
    };

    const removeBtn = document.createElement('button');
    removeBtn.innerText = '✖';
    removeBtn.className = 'remove-option';
    removeBtn.style.width = '32px';
    removeBtn.style.height = '32px';
    removeBtn.style.borderRadius = '30px';
    removeBtn.style.border = 'none';
    removeBtn.style.background = '#f1f5f9';
    removeBtn.style.cursor = 'pointer';
    removeBtn.onclick = () => {
        div.remove();
        updateMultiAnswerDisplay();
    };

    div.appendChild(input);
    div.appendChild(markCorrectBtn);
    div.appendChild(removeBtn);
    dynamicOptionsDiv.appendChild(div);
}

function updateMultiAnswerDisplay() {
    const correctValues = [];
    document.querySelectorAll('.multi-correct-btn.selected').forEach(btn => {
        const input = btn.parentElement.querySelector('input');
        if (input && input.value.trim()) {
            correctValues.push(input.value.trim());
        }
    });
    newAnswerInput.value = correctValues.join(', ');
}

newQuestionType.addEventListener('change', () => {
    renderDynamicOptions();
    newAnswerInput.value = '';
    if (newQuestionType.value === 'true_false') {
        newAnswerInput.style.display = 'none';
    } else {
        newAnswerInput.style.display = 'block';
        if (newQuestionType.value === 'multi') {
            newAnswerInput.placeholder = '點選「標記為正確答案」可複選';
            newAnswerInput.readOnly = true;
        } else if (newQuestionType.value === 'matching') {
            newAnswerInput.placeholder = '配對設定將自動產生';
            newAnswerInput.readOnly = true;
        } else {
            newAnswerInput.placeholder = '點選「設為答案」按鈕';
            newAnswerInput.readOnly = true;
        }
    }
});
addOptionBtn.addEventListener('click', () => {
    const type = newQuestionType.value;
    if (type === 'multi') {
        addMultiOptionInput('');
    } else if (type === 'single') {
        addSingleOptionInput('');
    }
});

// ======================== 儲存題目 ========================
saveQuestionBtn.addEventListener('click', () => {
    const questionText = newQuestionText.value.trim();
    if (!questionText) { alert('請輸入題目'); return; }
    const type = newQuestionType.value;

    let options = [];
    let answer = '';

    if (type === 'true_false') {
        options = ['是', '非'];
        answer = newAnswerInput.value;
        if (answer !== '是' && answer !== '非') {
            alert('請點選「是」或「非」設定正確答案');
            return;
        }
    } 
    else if (type === 'multi') {
        const optionInputs = document.querySelectorAll('#dynamicOptions .option-input-row input');
        options = Array.from(optionInputs).map(inp => inp.value.trim()).filter(v => v !== '');
        if (options.length < 2) {
            alert('複選題至少需要兩個選項');
            return;
        }
        const correctValues = [];
        document.querySelectorAll('.multi-correct-btn.selected').forEach(btn => {
            const input = btn.parentElement.querySelector('input');
            if (input && input.value.trim()) {
                correctValues.push(input.value.trim());
            }
        });
        if (correctValues.length === 0) {
            alert('請至少標記一個正確答案');
            return;
        }
        if (correctValues.some(v => !options.includes(v))) {
            alert('標記的正確答案必須與選項文字完全相同');
            return;
        }
        answer = JSON.stringify(correctValues);
    }
    else if (type === 'matching') {
        // 直接從 matchingLeftItems 和 matchingRightBoxes 建構答案
        if (matchingLeftItems.length === 0) {
            alert('請至少新增一個案例');
            return;
        }
        if (matchingRightBoxes.length === 0) {
            alert('請至少新增一個配對框');
            return;
        }
        // 檢查每個案例都有配對
        for (let item of matchingLeftItems) {
            if (!item.matchTo || !matchingRightBoxes.some(b => b.id === item.matchTo)) {
                alert(`案例「${item.text}」未正確選擇配對框`);
                return;
            }
        }
        options = []; // 配對題不需要 options
        const answerObj = {
            leftItems: matchingLeftItems,
            rightBoxes: matchingRightBoxes,
            matches: Object.fromEntries(matchingLeftItems.map(item => [item.id, item.matchTo]))
        };
        answer = JSON.stringify(answerObj);
    }
    else { // single
        const optionInputs = document.querySelectorAll('#dynamicOptions .option-input-row input');
        options = Array.from(optionInputs).map(inp => inp.value.trim()).filter(v => v !== '');
        if (options.length < 2) {
            alert('單選題至少需要兩個選項');
            return;
        }
        answer = newAnswerInput.value.trim();
        if (!answer) {
            alert('請為此題目設定正確答案（點選選項旁的「設為答案」）');
            return;
        }
        if (!options.includes(answer)) {
            alert('設定的答案必須與其中一個選項文字完全相同');
            return;
        }
    }

    const newQuestion = {
        id: editingId ? editingId : Date.now().toString(),
        question: questionText,
        type: type,
        options: options,
        answer: answer,
        createdAt: new Date().toISOString()
    };
    // 配對題額外儲存結構
    if (type === 'matching') {
        const ansObj = JSON.parse(answer);
        newQuestion.matchingLeftItems = ansObj.leftItems;
        newQuestion.matchingRightBoxes = ansObj.rightBoxes;
        newQuestion.matchingMatches = ansObj.matches;
    }

    if (editingId) {
        const index = questionBank.findIndex(q => q.id === editingId);
        if (index !== -1) questionBank[index] = newQuestion;
        editingId = null;
        saveQuestionBtn.innerText = '📌 儲存題目';
    } else {
        questionBank.push(newQuestion);
    }
    saveQuestionBank();
    renderQuestionBank();
    // 清空表單
    newQuestionText.value = '';
    newAnswerInput.value = '';
    // 重置配對題編輯變數
    matchingLeftItems = [];
    matchingRightBoxes = [];
    renderDynamicOptions();
    renderReviewLists();
});

// ======================== 渲染題庫列表 ========================
function renderQuestionBank() {
    if (!questionBankListDiv) return;
    if (questionBank.length === 0) {
        questionBankListDiv.innerHTML = '<div class="question-item">目前無題目，請新增</div>';
        return;
    }
    questionBankListDiv.innerHTML = questionBank.map(q => {
        let typeName = '';
        let answerDisplay = '';
        if (q.type === 'single') {
            typeName = '單選';
            answerDisplay = q.answer;
        } else if (q.type === 'multi') {
            typeName = '複選';
            const answers = JSON.parse(q.answer);
            answerDisplay = answers.join(', ');
        } else if (q.type === 'matching') {
            typeName = '配對題';
            const leftCount = q.matchingLeftItems?.length || 0;
            answerDisplay = `${leftCount} 個配對`;
        } else {
            typeName = '是非';
            answerDisplay = q.answer;
        }
        return `
        <div class="question-item" data-id="${q.id}">
            <div class="question-text">${escapeHtml(q.question)}</div>
            <div class="question-meta">題型: ${typeName} | ${answerDisplay}</div>
            <div class="question-actions">
                <button class="edit-btn" data-id="${q.id}">✏️ 編輯</button>
                <button class="delete-btn" data-id="${q.id}">🗑️ 刪除</button>
            </div>
        </div>
    `}).join('');

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            const q = questionBank.find(qq => qq.id === id);
            if (q) {
                editingId = id;
                newQuestionText.value = q.question;
                newQuestionType.value = q.type;
                renderDynamicOptions();

                if (q.type === 'true_false') {
                    setTimeout(() => {
                        const answer = q.answer;
                        const btns = document.querySelectorAll('.tf-option');
                        if (answer === '是') btns[0]?.click();
                        else if (answer === '非') btns[1]?.click();
                    }, 10);
                } else if (q.type === 'multi') {
                    setTimeout(() => {
                        const answers = JSON.parse(q.answer);
                        const inputs = document.querySelectorAll('#dynamicOptions .option-input-row input');
                        const markBtns = document.querySelectorAll('.multi-correct-btn');
                        inputs.forEach((input, idx) => {
                            input.value = q.options[idx] || '';
                        });
                        markBtns.forEach(btn => {
                            btn.classList.remove('selected');
                            btn.style.background = '#f1f5f9';
                            btn.style.borderColor = '#cbd5e1';
                        });
                        markBtns.forEach((btn, idx) => {
                            const optText = inputs[idx]?.value.trim();
                            if (answers.includes(optText)) {
                                btn.classList.add('selected');
                                btn.style.background = '#d1fae5';
                                btn.style.borderColor = '#10b981';
                            }
                        });
                        updateMultiAnswerDisplay();
                    }, 10);
                } else if (q.type === 'matching') {
                    setTimeout(() => {
                        matchingLeftItems = JSON.parse(JSON.stringify(q.matchingLeftItems || []));
                        matchingRightBoxes = JSON.parse(JSON.stringify(q.matchingRightBoxes || []));
                        // 確保每個 left item 有 matchTo
                        matchingLeftItems.forEach(item => {
                            if (!item.matchTo && matchingRightBoxes.length) item.matchTo = matchingRightBoxes[0].id;
                        });
                        renderMatchingEditorUI();
                    }, 10);
                } else {
                    setTimeout(() => {
                        const inputs = document.querySelectorAll('#dynamicOptions .option-input-row input');
                        q.options.forEach((opt, idx) => {
                            if (inputs[idx]) inputs[idx].value = opt;
                        });
                        const answerText = q.answer;
                        const setAnswerBtns = document.querySelectorAll('.set-answer-btn');
                        for (let i = 0; i < inputs.length; i++) {
                            if (inputs[i].value.trim() === answerText) {
                                setAnswerBtns[i]?.click();
                                break;
                            }
                        }
                    }, 10);
                }
                saveQuestionBtn.innerText = '✏️ 更新題目';
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            if (confirm('刪除題目會同時從錯題/不熟題庫移除，確定嗎？')) {
                questionBank = questionBank.filter(q => q.id !== id);
                wrongQuestions = wrongQuestions.filter(wid => wid !== id);
                weakQuestions = weakQuestions.filter(wid => wid !== id);
                syncAllStorage();
                renderQuestionBank();
                renderReviewLists();
                if (editingId === id) editingId = null;
            }
        });
    });
}

// ======================== 錯題 / 不熟題庫 ========================
function renderReviewLists() {
    const wrongItems = wrongQuestions.map(id => questionBank.find(q => q.id === id)).filter(q => q);
    const weakItems = weakQuestions.map(id => questionBank.find(q => q.id === id)).filter(q => q);
    wrongCountBadge.innerText = wrongItems.length;
    weakCountBadge.innerText = weakItems.length;

    wrongListDiv.innerHTML = wrongItems.map(q => {
        let answerDisplay = '';
        if (q.type === 'multi') {
            const answers = JSON.parse(q.answer);
            answerDisplay = answers.join(', ');
        } else if (q.type === 'matching') {
            answerDisplay = '配對題';
        } else {
            answerDisplay = q.answer;
        }
        return `
        <div class="review-item" data-id="${q.id}">
            <span class="review-question">${escapeHtml(q.question)} (正確答案：${escapeHtml(answerDisplay)})</span>
            <button class="remove-review-btn" data-id="${q.id}" data-type="wrong">✔️ 已學會 移除</button>
        </div>
    `}).join('');
    weakListDiv.innerHTML = weakItems.map(q => {
        let answerDisplay = '';
        if (q.type === 'multi') {
            const answers = JSON.parse(q.answer);
            answerDisplay = answers.join(', ');
        } else if (q.type === 'matching') {
            answerDisplay = '配對題';
        } else {
            answerDisplay = q.answer;
        }
        return `
        <div class="review-item" data-id="${q.id}">
            <span class="review-question">${escapeHtml(q.question)} (正確答案：${escapeHtml(answerDisplay)})</span>
            <button class="remove-review-btn" data-id="${q.id}" data-type="weak">✔️ 已學會 移除</button>
        </div>
    `}).join('');

    document.querySelectorAll('.remove-review-btn[data-type="wrong"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            wrongQuestions = wrongQuestions.filter(wid => wid !== id);
            saveWrongQuestions();
            renderReviewLists();
        });
    });
    document.querySelectorAll('.remove-review-btn[data-type="weak"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            weakQuestions = weakQuestions.filter(wid => wid !== id);
            saveWeakQuestions();
            renderReviewLists();
        });
    });
}

practiceWrongBtn.addEventListener('click', () => startExamBySource('wrong'));
practiceWeakBtn.addEventListener('click', () => startExamBySource('weak'));

function startExamBySource(source) {
    document.querySelector('[data-tab="exam"]').click();
    const sourceSelect = document.getElementById('quizSource');
    sourceSelect.value = source;
    document.getElementById('startExamBtn').click();
}

// ======================== 測驗核心 ========================
const examSetupPanel = document.getElementById('examSetupPanel');
const examActivePanel = document.getElementById('examActivePanel');
const examResultPanel = document.getElementById('examResultPanel');
const startExamBtn = document.getElementById('startExamBtn');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const backToSetupBtn = document.getElementById('backToSetupBtn');
const retrySameExamBtn = document.getElementById('retrySameExamBtn');

startExamBtn.addEventListener('click', () => {
    const limit = parseInt(document.getElementById('quizLimit').value);
    let source = document.getElementById('quizSource').value;
    let sourceIds = [];
    
    if (source === 'all') {
        sourceIds = questionBank.map(q => q.id);
    } else if (source === 'wrong') {
        sourceIds = [...wrongQuestions];
    } else if (source === 'weak') {
        sourceIds = [...weakQuestions];
    } else if (source === 'single') {
        sourceIds = questionBank.filter(q => q.type === 'single' || q.type === 'multi').map(q => q.id);
    } else if (source === 'true_false') {
        sourceIds = questionBank.filter(q => q.type === 'true_false').map(q => q.id);
    } else if (source === 'matching') {
        sourceIds = questionBank.filter(q => q.type === 'matching').map(q => q.id);
    }
    
    const availableQuestions = sourceIds.map(id => questionBank.find(q => q.id === id)).filter(q => q);
    if (availableQuestions.length === 0) {
        alert('此來源沒有任何題目，請先新增題目或累積錯題/不熟題');
        return;
    }
    const shuffled = [...availableQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    currentQuizQuestions = shuffled.slice(0, Math.min(limit, shuffled.length));
    if (currentQuizQuestions.length === 0) return;
    currentIndex = 0;
    userAnswers = [];
    answerTimes = [];
    quizActive = true;
    examSetupPanel.style.display = 'none';
    examActivePanel.style.display = 'block';
    examResultPanel.style.display = 'none';
    loadCurrentQuestion();
});

function loadCurrentQuestion() {
    if (!quizActive) return;
    if (currentIndex >= currentQuizQuestions.length) {
        finishExam();
        return;
    }
    selectedOptionLock = false;
    nextQuestionBtn.disabled = true;
    currentQuestionObj = currentQuizQuestions[currentIndex];
    document.getElementById('currentQIndex').innerText = currentIndex + 1;
    document.getElementById('totalQCount').innerText = currentQuizQuestions.length;
    document.getElementById('questionDisplay').innerHTML = escapeHtml(currentQuestionObj.question);
    const optionsArea = document.getElementById('optionsArea');
    optionsArea.innerHTML = '';
    const keyboardHint = document.getElementById('keyboardHint');
    
    if (currentQuestionObj.type === 'multi') {
        keyboardHint.innerText = '💡 複選題請勾選答案後點擊「確認答案」';
        const shuffledOptions = [...currentQuestionObj.options];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        currentMultiSelected = [];
        shuffledOptions.forEach((opt, idx) => {
            const div = document.createElement('div');
            div.className = 'checkbox-option';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = `opt_${idx}`;
            cb.value = opt;
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    currentMultiSelected.push(opt);
                } else {
                    currentMultiSelected = currentMultiSelected.filter(v => v !== opt);
                }
            });
            const label = document.createElement('label');
            label.htmlFor = `opt_${idx}`;
            label.innerText = opt;
            div.appendChild(cb);
            div.appendChild(label);
            optionsArea.appendChild(div);
        });
        const submitBtn = document.createElement('button');
        submitBtn.innerText = '✅ 確認答案';
        submitBtn.className = 'btn-next submit-answer-btn';
        submitBtn.addEventListener('click', () => handleMultiAnswer());
        optionsArea.appendChild(submitBtn);
    } else if (currentQuestionObj.type === 'matching') {
        keyboardHint.innerText = '💡 點選左側案例，再點選右側框進行配對；點擊已配對項目可移回左側';
        renderMatchingQuestion(optionsArea);
    } else {
        keyboardHint.innerText = '💡 快捷鍵: 1 2 3 4 直接選擇答案';
        const shuffledOptions = [...currentQuestionObj.options];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        shuffledOptions.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.innerText = `${String.fromCharCode(65+idx)}. ${opt}`;
            btn.className = 'option-btn';
            btn.dataset.value = opt;
            btn.addEventListener('click', () => handleAnswer(opt, btn));
            optionsArea.appendChild(btn);
        });
    }
    if (quizTimer) clearTimeout(quizTimer);
    quizStartTime = Date.now();
    document.getElementById('feedbackMsg').innerHTML = '';
}

// 打亂陣列的輔助函數
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function renderMatchingQuestion(container) {
    const data = currentQuestionObj;
    // 複製並打亂左側案例和右側框的順序（不影響原始資料）
    const shuffledLeftItems = shuffleArray([...data.matchingLeftItems]);
    const shuffledRightBoxes = shuffleArray([...data.matchingRightBoxes]);
    
    // 初始化狀態（使用打亂後的順序，但 assignments 仍基於原始 id）
    if (!currentMatchingState) {
        const assignments = {};
        data.matchingLeftItems.forEach(item => { assignments[item.id] = null; });
        currentMatchingState = {
            leftItems: shuffledLeftItems,
            rightBoxes: shuffledRightBoxes,
            assignments: assignments,
            selectedLeftId: null
        };
    } else {
        // 更新打亂後的順序（但保留 assignments）
        currentMatchingState.leftItems = shuffledLeftItems;
        currentMatchingState.rightBoxes = shuffledRightBoxes;
    }
    const state = currentMatchingState;
    
    const mainDiv = document.createElement('div');
    mainDiv.className = 'matching-container';
    
    // 左側區塊
    const leftDiv = document.createElement('div');
    leftDiv.className = 'matching-left';
    leftDiv.innerHTML = '<h4>📌 案例清單</h4><ul id="matchingLeftUl"></ul>';
    const leftUl = leftDiv.querySelector('#matchingLeftUl');
    state.leftItems.forEach(item => {
        const li = document.createElement('li');
        li.innerText = item.text;
        li.dataset.id = item.id;
        if (state.assignments[item.id] !== null) {
            li.style.opacity = '0.5';
            li.style.textDecoration = 'line-through';
            li.style.pointerEvents = 'none';
        } else {
            li.addEventListener('click', () => {
                document.querySelectorAll('#matchingLeftUl li').forEach(l => l.classList.remove('selected-for-match'));
                li.classList.add('selected-for-match');
                state.selectedLeftId = item.id;
            });
        }
        leftUl.appendChild(li);
    });
    
    // 右側區塊
    const rightDiv = document.createElement('div');
    rightDiv.className = 'matching-right';
    rightDiv.innerHTML = '<h4>📦 配對框</h4><div class="right-boxes" id="rightBoxesContainer"></div>';
    const boxesContainer = rightDiv.querySelector('#rightBoxesContainer');
    state.rightBoxes.forEach(box => {
        const boxDiv = document.createElement('div');
        boxDiv.className = 'right-box';
        boxDiv.dataset.id = box.id;
        const header = document.createElement('div');
        header.className = 'right-box-header';
        header.innerText = box.label;
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'right-box-items';
        const matchedItems = Object.entries(state.assignments).filter(([leftId, rightId]) => rightId === box.id);
        matchedItems.forEach(([leftId]) => {
            const leftItem = data.matchingLeftItems.find(i => i.id === leftId);
            if (leftItem) {
                const chip = document.createElement('span');
                chip.className = 'matched-item';
                chip.innerText = leftItem.text;
                chip.dataset.leftId = leftId;
                 chip.addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.assignments[leftId] = null;
                    renderMatchingQuestion(container);
                });
                itemsDiv.appendChild(chip);
            }
        });
        boxDiv.appendChild(header);
        boxDiv.appendChild(itemsDiv);
        boxDiv.addEventListener('click', () => {
            if (state.selectedLeftId) {
                const leftItem = data.matchingLeftItems.find(i => i.id === state.selectedLeftId);
                if (leftItem && state.assignments[leftItem.id] === null) {
                    state.assignments[leftItem.id] = box.id;
                    state.selectedLeftId = null;
                    renderMatchingQuestion(container);
                }
            }
        });
        boxesContainer.appendChild(boxDiv);
    });
    
    mainDiv.appendChild(leftDiv);
    mainDiv.appendChild(rightDiv);
    
    const submitBtn = document.createElement('button');
    submitBtn.innerText = '✅ 提交配對答案';
    submitBtn.className = 'btn-next submit-answer-btn';
    submitBtn.addEventListener('click', () => handleMatchingAnswer());
    container.appendChild(mainDiv);
    container.appendChild(submitBtn);
}

function handleMatchingAnswer() {
    if (selectedOptionLock) return;
    selectedOptionLock = true;
    const endTime = Date.now();
    const elapsedSec = (endTime - quizStartTime) / 1000;
    answerTimes.push(elapsedSec);
    
    const data = currentQuestionObj;
    const correctMatches = data.matchingMatches || {};
    const userMatches = currentMatchingState.assignments;
    let isCorrect = true;
    for (let leftId of Object.keys(correctMatches)) {
        if (userMatches[leftId] !== correctMatches[leftId]) {
            isCorrect = false;
            break;
        }
    }
    userAnswers.push(isCorrect);
    
    if (elapsedSec > 4) {
        if (!weakQuestions.includes(currentQuestionObj.id)) {
            weakQuestions.push(currentQuestionObj.id);
            saveWeakQuestions();
        }
    }
    if (!isCorrect) {
        if (!wrongQuestions.includes(currentQuestionObj.id)) {
            wrongQuestions.push(currentQuestionObj.id);
            saveWrongQuestions();
        }
        const correctText = Object.entries(correctMatches).map(([leftId, rightId]) => {
            const leftItem = data.matchingLeftItems.find(i => i.id === leftId);
            const rightBox = data.matchingRightBoxes.find(b => b.id === rightId);
            return `${leftItem?.text} → ${rightBox?.label}`;
        }).join('； ');
        document.getElementById('feedbackMsg').innerHTML = `<span style="color:#b91c1c;">❌ 配對錯誤！正確配對：${correctText}</span>`;
        document.querySelectorAll('#optionsArea li, #optionsArea .right-box').forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.6';
        });
        const submitBtn = document.querySelector('#optionsArea .submit-answer-btn');
        if (submitBtn) submitBtn.disabled = true;
    } else {
        document.getElementById('feedbackMsg').innerHTML = `<span style="color:#10b981;">✅ 配對完全正確！</span>`;
        document.querySelectorAll('#optionsArea li, #optionsArea .right-box').forEach(el => {
            el.style.pointerEvents = 'none';
        });
        const submitBtn = document.querySelector('#optionsArea .submit-answer-btn');
        if (submitBtn) submitBtn.disabled = true;
    }
    nextQuestionBtn.disabled = false;
}

function handleMultiAnswer() {
    if (selectedOptionLock) return;
    selectedOptionLock = true;
    const endTime = Date.now();
    const elapsedSec = (endTime - quizStartTime) / 1000;
    answerTimes.push(elapsedSec);
    
    const correctAnswers = JSON.parse(currentQuestionObj.answer);
    const isCorrect = (currentMultiSelected.length === correctAnswers.length && 
                       currentMultiSelected.every(v => correctAnswers.includes(v)));
    userAnswers.push(isCorrect);
    
    if (elapsedSec > 4) {
        if (!weakQuestions.includes(currentQuestionObj.id)) {
            weakQuestions.push(currentQuestionObj.id);
            saveWeakQuestions();
        }
    }
    if (!isCorrect) {
        if (!wrongQuestions.includes(currentQuestionObj.id)) {
            wrongQuestions.push(currentQuestionObj.id);
            saveWrongQuestions();
        }
        document.getElementById('feedbackMsg').innerHTML = `<span style="color:#b91c1c;">❌ 錯誤！正確答案：${correctAnswers.join(', ')}</span>`;
        const allCheckboxDivs = document.querySelectorAll('.checkbox-option');
        allCheckboxDivs.forEach(div => {
            const cb = div.querySelector('input');
            const label = div.querySelector('label');
            const optText = label.innerText;
            if (correctAnswers.includes(optText)) {
                div.style.background = '#d1fae5';
                div.style.borderColor = '#10b981';
            } else if (cb.checked && !correctAnswers.includes(optText)) {
                div.style.background = '#fee2e2';
                div.style.borderColor = '#ef4444';
            }
            cb.disabled = true;
        });
        const submitBtn = document.querySelector('#optionsArea .submit-answer-btn');
        if (submitBtn) submitBtn.disabled = true;
    } else {
        document.getElementById('feedbackMsg').innerHTML = `<span style="color:#10b981;">✅ 答對了！</span>`;
        const allCheckboxDivs = document.querySelectorAll('.checkbox-option');
        allCheckboxDivs.forEach(div => {
            const cb = div.querySelector('input');
            cb.disabled = true;
        });
        const submitBtn = document.querySelector('#optionsArea .submit-answer-btn');
        if (submitBtn) submitBtn.disabled = true;
    }
    nextQuestionBtn.disabled = false;
}

function handleAnswer(selected, btnElement) {
    if (selectedOptionLock) return;
    selectedOptionLock = true;
    const endTime = Date.now();
    const elapsedSec = (endTime - quizStartTime) / 1000;
    answerTimes.push(elapsedSec);
    const isCorrect = (selected === currentQuestionObj.answer);
    userAnswers.push(isCorrect);
    if (elapsedSec > 4) {
        if (!weakQuestions.includes(currentQuestionObj.id)) {
            weakQuestions.push(currentQuestionObj.id);
            saveWeakQuestions();
        }
    }
    if (!isCorrect) {
        if (!wrongQuestions.includes(currentQuestionObj.id)) {
            wrongQuestions.push(currentQuestionObj.id);
            saveWrongQuestions();
        }
        document.getElementById('feedbackMsg').innerHTML = `<span style="color:#b91c1c;">❌ 錯誤！正確答案：${currentQuestionObj.answer}</span>`;
        const allOptBtns = document.querySelectorAll('.option-btn');
        allOptBtns.forEach(btn => {
            if (btn.dataset.value === currentQuestionObj.answer) {
                btn.classList.add('option-correct');
            }
            if (btn === btnElement && btn.dataset.value !== currentQuestionObj.answer) {
                btn.classList.add('option-wrong');
            }
        });
    } else {
        document.getElementById('feedbackMsg').innerHTML = `<span style="color:#10b981;">✅ 答對了！</span>`;
        btnElement.classList.add('option-correct');
    }
    nextQuestionBtn.disabled = false;
}

nextQuestionBtn.addEventListener('click', () => {
    if (!quizActive) return;
    if (nextQuestionBtn.disabled) return;
    currentIndex++;
    currentMatchingState = null;
    loadCurrentQuestion();
});

function finishExam() {
    quizActive = false;
    examActivePanel.style.display = 'none';
    examResultPanel.style.display = 'block';
    const total = currentQuizQuestions.length;
    const correctCount = userAnswers.filter(v => v === true).length;
    const percent = total === 0 ? 0 : ((correctCount / total) * 100).toFixed(1);
    const avgTime = answerTimes.length ? (answerTimes.reduce((a,b)=>a+b,0)/answerTimes.length).toFixed(1) : 0;
    document.getElementById('resultTotal').innerText = total;
    document.getElementById('resultCorrect').innerText = correctCount;
    document.getElementById('resultPercent').innerText = percent;
    document.getElementById('avgTime').innerText = avgTime;
    const wrongListUl = document.getElementById('resultWrongList');
    wrongListUl.innerHTML = '';
    currentQuizQuestions.forEach((q, idx) => {
        if (!userAnswers[idx]) {
            let answerDisplay = '';
            if (q.type === 'multi') {
                const answers = JSON.parse(q.answer);
                answerDisplay = answers.join(', ');
            } else if (q.type === 'matching') {
                answerDisplay = '配對題';
            } else {
                answerDisplay = q.answer;
            }
            const li = document.createElement('li');
            li.innerText = `${q.question} (正確答案：${answerDisplay})`;
            wrongListUl.appendChild(li);
        }
    });
    renderReviewLists();
}

backToSetupBtn.addEventListener('click', () => resetExamUI());
retrySameExamBtn.addEventListener('click', () => {
    resetExamUI();
    startExamBtn.click();
});

function resetExamUI() {
    examActivePanel.style.display = 'none';
    examResultPanel.style.display = 'none';
    examSetupPanel.style.display = 'block';
    quizActive = false;
    currentMatchingState = null;
    if (quizTimer) clearTimeout(quizTimer);
}

// ======================== 標籤切換與輔助 ========================
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.section-container').forEach(sec => sec.classList.remove('active-section'));
        if (tab === 'manager') managerSection.classList.add('active-section');
        if (tab === 'exam') examSection.classList.add('active-section');
        if (tab === 'review') reviewSection.classList.add('active-section');
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderReviewLists();
    });
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('keydown', (e) => {
    if (!quizActive || examActivePanel.style.display !== 'block') return;
    if (currentQuestionObj && currentQuestionObj.type !== 'multi' && currentQuestionObj.type !== 'matching') {
        const key = e.key;
        if (['1','2','3','4'].includes(key)) {
            const index = parseInt(key) - 1;
            const optionBtns = document.querySelectorAll('.option-btn');
            if (optionBtns[index] && !selectedOptionLock) {
                optionBtns[index].click();
            }
        }
    }
});

// 初始化
loadData();
renderDynamicOptions();