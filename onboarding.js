(function() {
    var TI_AVATAR_KEY = 'tiSettings_showAvatar';
    var TI_TEXT_KEY = 'tiSettings_customText';
    var tiShowAvatar = localStorage.getItem(TI_AVATAR_KEY) !== 'false';
    var tiCustomText = localStorage.getItem(TI_TEXT_KEY) || '';

    function applyTiAvatarVisibility() {
        var avatarEl = document.getElementById('typing-indicator-avatar');
        if (!avatarEl) return;
        avatarEl.style.display = tiShowAvatar ? '' : 'none';
    }

    function getTiLabel() {
        if (tiCustomText) return tiCustomText;
        var name = (window.settings && settings.partnerName) ? settings.partnerName : '对方';
        return name + ' 正在输入';
    }

    function updatePreview() {
        var previewText = document.getElementById('ti-preview-text');
        var previewAvatar = document.getElementById('ti-preview-avatar');
        if (previewText) previewText.textContent = getTiLabel();
        if (previewAvatar) previewAvatar.style.display = tiShowAvatar ? '' : 'none';
        var label = document.getElementById('typing-indicator-label');
        if (label && label.textContent) label.textContent = getTiLabel();
        var actualAvatar = document.getElementById('typing-indicator-avatar');
        if (actualAvatar) actualAvatar.style.display = tiShowAvatar ? '' : 'none';
    }

    function syncPillUI() {
        var row = document.getElementById('ti-avatar-toggle');
        if (!row) return;
        if (tiShowAvatar) {
            row.classList.add('active');
        } else {
            row.classList.remove('active');
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        applyTiAvatarVisibility();
    });

    var _origSetLabel = null;
    function patchTypingLabel() {
        var label = document.getElementById('typing-indicator-label');
        if (label && tiCustomText) {
            label.textContent = tiCustomText;
        }
    }
    var labelEl = null;
    function initLabelObserver() {
        labelEl = document.getElementById('typing-indicator-label');
        if (!labelEl || labelEl._tiObserved) return;
        labelEl._tiObserved = true;
        var obs = new MutationObserver(function() {
            if (tiCustomText && labelEl.textContent !== tiCustomText) {
                labelEl.textContent = tiCustomText;
            }
        });
        obs.observe(labelEl, { childList: true, characterData: true, subtree: true });
    }
    setTimeout(initLabelObserver, 1000);

    document.addEventListener('click', function(e) {
        var ti = e.target.closest('.typing-indicator');
        if (!ti) return;
        e.stopPropagation();
        initLabelObserver();
        var modal = document.getElementById('ti-settings-modal');
        if (!modal) return;
        var input = document.getElementById('ti-text-input');
        if (input) input.value = tiCustomText;
        syncPillUI();
        updatePreview();
        var partnerImg = document.querySelector('#partner-info .message-avatar img') ||
                         document.querySelector('.partner-avatar img') ||
                         document.querySelector('[id*="partner"] img');
        var previewAvatar = document.getElementById('ti-preview-avatar');
        if (previewAvatar && partnerImg) {
            previewAvatar.innerHTML = '<img src="' + partnerImg.src + '" style="width:100%;height:100%;object-fit:cover;">';
        }
        modal.classList.add('open');
    });

    document.addEventListener('click', function(e) {
        var modal = document.getElementById('ti-settings-modal');
        if (!modal || !modal.classList.contains('open')) return;
        if (e.target === modal) modal.classList.remove('open');
    });
    document.addEventListener('click', function(e) {
        if (e.target.id === 'ti-settings-close-btn') {
            var modal = document.getElementById('ti-settings-modal');
            if (modal) modal.classList.remove('open');
        }
    });

    document.addEventListener('click', function(e) {
        var row = e.target.closest('#ti-avatar-toggle');
        if (!row) return;
        tiShowAvatar = !tiShowAvatar;
        localStorage.setItem(TI_AVATAR_KEY, tiShowAvatar);
        syncPillUI();
        updatePreview();
        applyTiAvatarVisibility();
    });

    document.addEventListener('click', function(e) {
        if (e.target.id !== 'ti-text-save-btn') return;
        var input = document.getElementById('ti-text-input');
        if (!input) return;
        tiCustomText = input.value.trim();
        localStorage.setItem(TI_TEXT_KEY, tiCustomText);
        updatePreview();
        e.target.textContent = '已保存 ✓';
        setTimeout(function() { e.target.textContent = '保存'; }, 1200);
    });

    document.addEventListener('click', function(e) {
        if (e.target.id !== 'ti-text-reset-btn') return;
        tiCustomText = '';
        localStorage.removeItem(TI_TEXT_KEY);
        var input = document.getElementById('ti-text-input');
        if (input) input.value = '';
        updatePreview();
    });

    document.addEventListener('DOMContentLoaded', function() { syncPillUI(); });
    setTimeout(syncPillUI, 800);
})();


async function createNewSession(switchToIt = true) {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newSession = {
        id: newId,
        name: `会话 ${new Date().toLocaleDateString()}`,
        createdAt: Date.now()
    };

    sessionList.push(newSession);
    await localforage.setItem(`${APP_PREFIX}sessionList`, sessionList);

    if (switchToIt) {
        window.location.hash = newId;
        window.location.reload();
    }
    
    return newId;
}

window.selectAnnType = function(type) {
    currentAnniversaryType = type;
    currentAnnType = type; 
    document.querySelectorAll('.anniversary-type-btn').forEach(btn => {
        if(btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const hint = document.getElementById('ann-type-desc');
    if(hint) {
        hint.textContent = type === 'anniversary' 
            ? '计算从过去某一天到现在已经过了多少天 (例如: 恋爱纪念日)' 
            : '计算从现在到未来某一天还剩下多少天 (例如: 对方生日)';
    }
};

window.deleteAnniversary = function(id, event) {
    if(event) event.stopPropagation();
    
    if(confirm('确定要删除这个纪念日吗？')) {
        anniversaries = anniversaries.filter(a => a.id !== id);
        throttledSaveData();
        renderAnniversariesList();
        showNotification('纪念日已删除', 'success');
    }
};

let activeAnnId = null;

async function fillAnnHeaderCard(ann) {
    const headerCard = document.getElementById('ann-header-card');
    const toolbar = document.getElementById('ann-card-toolbar');
    if (!ann || !headerCard) return;

    activeAnnId = ann.id;
    headerCard.style.display = 'block';
    if (toolbar) toolbar.style.display = 'flex';

    const now = new Date();
    const isCountdown = ann.type === 'countdown';
    const targetDate = new Date(ann.date);
    let diffDays;
    if (isCountdown) {
        diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) diffDays = 0;
    } else {
        diffDays = Math.floor((now - targetDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) diffDays = 0;
    }

    const iconEl = document.getElementById('ann-header-icon');
    const labelEl = document.getElementById('ann-header-label');
    if (iconEl) iconEl.textContent = isCountdown ? '♡' : '♥';
    if (labelEl) labelEl.textContent = isCountdown ? 'COUNTDOWN' : 'ANNIVERSARY';
    document.getElementById('ann-header-title').textContent = ann.name;
    document.getElementById('ann-header-date').textContent = ann.date;
    const daysEl = document.getElementById('ann-header-days');
    daysEl.innerHTML = `${diffDays.toLocaleString('zh-CN')}<span class="ann-header-days-unit">${isCountdown ? '天后' : '天'}</span>`;

    const milestonesEl = document.getElementById('ann-header-milestones');
    if (milestonesEl) {
        milestonesEl.innerHTML = '';
        milestonesEl.style.display = 'none';
    }

    const titleEl = document.getElementById('ann-header-title');
    if (titleEl) titleEl.style.display = 'none';
    const labelEl2 = document.getElementById('ann-header-label');
    if (labelEl2) labelEl2.style.display = 'none';
    const dateEl = document.getElementById('ann-header-date');
    if (dateEl) dateEl.style.display = 'none';

    const dataMilestonesEl = document.getElementById('ann-data-milestones');
    if (dataMilestonesEl) {
        const chips = [];
        const pushChip = (t) => chips.push(`<span class="ann-milestone-chip">${t}</span>`);

        if (!isCountdown) {
            if (diffDays > 0 && diffDays < 100) {
                pushChip(`💫 距 100 天还有 ${100 - diffDays} 天`);
            }
            const centPassed = Math.floor(diffDays / 100) * 100;
            if (centPassed > 0) pushChip(`🎉 已到第 ${centPassed} 天`);

            const yearsPassed = Math.floor(diffDays / 365);
            if (yearsPassed > 0) pushChip(`🎊 已过 ${yearsPassed} 周年`);

            if (diffDays >= 100 && diffDays < 365) {
                const nextCent = 100 * (Math.floor(diffDays / 100) + 1);
                pushChip(`⏳ 距下一段百天还有 ${nextCent - diffDays} 天`);
            }
        } else {
            const daysLeft = diffDays;
            if (daysLeft > 0 && daysLeft < 100) {
                pushChip(`⏳ 距 100 天还有 ${100 - daysLeft} 天`);
            }
            if (daysLeft >= 100) {
                const nextCent = 100 * Math.ceil(daysLeft / 100);
                pushChip(`🎉 达到第 ${nextCent} 天段`);
            }
            const yearsLeft = Math.floor(daysLeft / 365);
            if (yearsLeft > 0) pushChip(`🎊 距 ${yearsLeft} 年段还有…`);
        }

        dataMilestonesEl.innerHTML = chips.join('') || `<span style="font-size:12px;opacity:0.65;color:var(--text-secondary);">—</span>`;
    }

    const bgEl = document.getElementById('ann-header-card-bg');
    if (bgEl) {
        const savedBg = await localforage.getItem(getStorageKey(`annHeaderBg_${ann.id}`));
        bgEl.style.backgroundImage = savedBg ? `url(${savedBg})` : '';
    }

    document.querySelectorAll('.ann-item-card').forEach(el => el.classList.remove('ann-item-active'));
    const activeEl = document.querySelector(`.ann-item-card[data-ann-id="${ann.id}"]`);
    if (activeEl) activeEl.classList.add('ann-item-active');
}

function renderAnniversariesList() {
    const listContainer = document.getElementById('ann-list-container');
    const headerCard = document.getElementById('ann-header-card');
    const toolbar = document.getElementById('ann-card-toolbar');
    
    if (!listContainer) return;
    listContainer.innerHTML = '';

    anniversaries.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (anniversaries.length === 0) {
        if (headerCard) headerCard.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        const dataTabs = document.getElementById('ann-data-tabs');
        const dataPanel = document.getElementById('ann-data-panel');
        if (dataTabs) dataTabs.style.display = 'none';
        if (dataPanel) dataPanel.style.display = 'none';
        listContainer.innerHTML = `
            <div class="ann-empty">
                <div class="ann-empty-icon">💝</div>
                <p>还没有纪念日<br>去添加一个属于你们的日子吧~</p>
            </div>`;
        return;
    }

    const now = new Date();
    const defaultAnn = anniversaries.find(a => a.type === 'anniversary') || anniversaries[0];
    fillAnnHeaderCard(defaultAnn);
    const dataTabs = document.getElementById('ann-data-tabs');
    const dataPanel = document.getElementById('ann-data-panel');
    if (dataTabs) dataTabs.style.display = 'flex';
    if (dataPanel) dataPanel.style.display = 'none';

    anniversaries.forEach(ann => {
        const targetDate = new Date(ann.date);
        let diffDays = 0;
        let typeClass = '';
        let typeLabel = '';
        let dayLabel = '';

        if (ann.type === 'countdown') {
            typeClass = 'type-future';
            typeLabel = '倒数';
            dayLabel = '天后';
            diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
            if(diffDays < 0) diffDays = 0;
        } else {
            typeClass = 'type-past';
            typeLabel = '已过';
            dayLabel = '天';
            diffDays = Math.floor((now - targetDate) / (1000 * 60 * 60 * 24));
        }

        const formattedDays = diffDays.toLocaleString('zh-CN');

        const html = `
            <div class="ann-item-card ${typeClass}" data-ann-id="${ann.id}" onclick="selectAnnCard(${ann.id})" style="cursor:pointer;" title="起始日：${ann.date}">
                <div class="ann-item-left">
                    <div class="ann-item-name">
                        ${ann.name}
                        <span class="ann-tag">${typeLabel}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="ann-item-right">
                        <div class="ann-item-days">${formattedDays}</div>
                        <div class="ann-item-days-unit">${dayLabel}</div>
                    </div>
                    <div class="ann-delete-btn" onclick="event.stopPropagation(); deleteAnniversaryItem(${ann.id})">
                        <i class="fas fa-times"></i>
                    </div>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', html);
    });
}

window.selectAnnCard = function(id) {
    const ann = anniversaries.find(a => a.id === id);
    if (ann) fillAnnHeaderCard(ann);
};

window.clearAnnCardBg = async function() {
    if (!activeAnnId) return;
    await localforage.removeItem(getStorageKey(`annHeaderBg_${activeAnnId}`));
    const bgEl = document.getElementById('ann-header-card-bg');
    if (bgEl) bgEl.style.backgroundImage = '';
    showNotification('封面图已清除', 'success');
};

window.switchAnnDataTab = function(tab) {
    const panel = document.getElementById('ann-data-panel');
    const cardBtn = document.getElementById('ann-tab-card');
    const dataBtn = document.getElementById('ann-tab-data');
    if (!panel || !cardBtn || !dataBtn) return;
    const showData = tab === 'data';
    panel.style.display = showData ? 'block' : 'none';
    // 保持按钮配色不变，用透明度表达当前页
    cardBtn.style.opacity = showData ? '0.75' : '1';
    dataBtn.style.opacity = showData ? '1' : '0.75';
};


function initAnniversaryModule() {
    const entryBtn = document.getElementById('anniversary-function');
    
    if (entryBtn) {
        const newBtn = entryBtn.cloneNode(true);
        entryBtn.parentNode.replaceChild(newBtn, entryBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('重要日按钮被点击');
            
            const advancedModal = document.getElementById('advanced-modal');
            const annModal = document.getElementById('anniversary-modal');
            
            if (advancedModal) hideModal(advancedModal);
            renderAnniversariesList();
                if (typeof window.switchAnnDataTab === 'function') window.switchAnnDataTab('card');
            if (annModal) showModal(annModal);
        });
    }

    const closeBtn = document.getElementById('close-anniversary-modal');
    if (closeBtn) {
        const newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', () => hideModal(document.getElementById('anniversary-modal')));
    }

    const openAddBtn = document.getElementById('open-ann-add-btn');
    const editorSlide = document.getElementById('ann-editor-slide');
    if (openAddBtn) {
        openAddBtn.onclick = () => {
            document.getElementById('ann-input-name').value = '';
            document.getElementById('ann-input-date').value = '';
            window.selectAnnType('anniversary');
            if (editorSlide) editorSlide.classList.add('active');
        };
    }

    const closeEditorBtn = document.getElementById('close-ann-editor');
    if (closeEditorBtn) {
        closeEditorBtn.onclick = () => {
            if (editorSlide) editorSlide.classList.remove('active');
        };
    }

    const saveBtn = document.getElementById('save-ann-btn');
    if (saveBtn) {
        const newSave = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSave, saveBtn);
        
        newSave.addEventListener('click', () => {
            addAnniversary(); 
            if (editorSlide) editorSlide.classList.remove('active');
        });
    }

    const annBgInput = document.getElementById('ann-header-bg-input');
    if (annBgInput) {
        annBgInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!activeAnnId) { showNotification('请先选择一个纪念日', 'warning'); return; }
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const dataUrl = ev.target.result;
                const bgEl = document.getElementById('ann-header-card-bg');
                if (bgEl) bgEl.style.backgroundImage = `url(${dataUrl})`;
                await localforage.setItem(getStorageKey(`annHeaderBg_${activeAnnId}`), dataUrl);
                showNotification('封面图已更新 ', 'success');
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });
    }
}
