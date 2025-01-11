// ==UserScript==
// @name         🔐 密码填充
// @namespace    https://ez118.github.io/
// @version      0.2.6
// @description  为Via设计的第三方密码自动保存/填充工具，支持管理与导出密码
// @author       ZZY_WISU
// @match        *://*/*
// @license      GPLv3
// @run-at       document-end
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL https://update.greasyfork.org/scripts/511297/%F0%9F%94%90%20%E5%AF%86%E7%A0%81%E5%A1%AB%E5%85%85.user.js
// @updateURL https://update.greasyfork.org/scripts/511297/%F0%9F%94%90%20%E5%AF%86%E7%A0%81%E5%A1%AB%E5%85%85.meta.js
// ==/UserScript==


/* =====[ 变量存储 ]===== */

const ICONS = {
    'del': '<svg viewBox="0 0 24 24" width="20px" height="20px"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>'
};

var savedAccount = [];

/* ====================== */
function Toast(text) {
    try{
        if (typeof(window.via) == "object") window.via.toast(text);
        else if (typeof(window.mbrowser) == "object") window.mbrowser.showToast(text);
        else alert(text);
    }catch{
        alert(text);
    }
}

function hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
}

function downloadFile(fileName, text) {
    const url = window.URL || window.webkitURL || window;
    const blob = new Blob([text]);
    const saveLink = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
    saveLink.href = url.createObjectURL(blob);
    // 设置 download 属性
    saveLink.download = fileName;
    saveLink.click();
}

function getHost() {
    return window.location.host;
}

function findByKeyValue(array, key, value) {
    /* 在JSON中，以键值匹配项 */
    return array.findIndex(item => item[key] === value);
}

function exportAccountData(){
    let csvText = "name,url,username,password,note\n";
    let fileName = "密码填充_" + hash(csvText) % 1e8 + ".csv";
    savedAccount.forEach((item, index) => {
        csvText += `${item.host},https://${item.host}/,${item.username},${item.password},\n`;
    });
    downloadFile(fileName, csvText);
}

function isLoginPage() {
    let forms = document.getElementsByTagName("form");
    let isLogin = false;
    let formPosition = {x: 0, y: 0};
    let formobj = null;

    Array.prototype.forEach.call(forms, (form) => {
        let hasTextInput = false;
        let hasPasswordInput = false;

        // 获取所有 input 元素
        let inputs = form.getElementsByTagName("input");

        // 检查每个 input 的类型
        Array.prototype.forEach.call(inputs, (input) => {
            if (input.type === "text" || input.type === "email") {
                hasTextInput = true;
            } else if (input.type === "password") {
                hasPasswordInput = true;
            }
        });

        // 如果同时存在 text 和 password 类型的输入框，认为是登录页面
        if (hasTextInput && hasPasswordInput) {
            isLogin = true;

            let rectData = form.getClientRects()[0];
            formPosition.x = rectData.left + rectData.width / 2 - 90;
            formPosition.y = rectData.top + rectData.height - 15;

            formobj = form;
        }
    });

    return { isLogin, x: formPosition.x, y: formPosition.y, obj: formobj };
}

function getFormData(ele){
    let inputs = ele.getElementsByTagName("input");
    let usr = null;
    let psw = null;

    // 检查每个 input 的类型
    Array.prototype.forEach.call(inputs, (input) => {
        if ((input.type === "text" || input.type === "email") && !usr) {
            usr = input;
        } else if (input.type === "password" && !psw) {
            psw = input;
        }
    });

    return {password: psw.value, username: usr.value, psw: psw, usr: usr};
}



function showPswMgr() {
    if (document.getElementById("userscript-pswmgrDlg")) { return; }

    let newAccountList = savedAccount.slice(); // 不直接引用
    let origAccountList = savedAccount.slice();

    const optDlg = document.createElement('div');
    optDlg.className = 'userscript-pswmgrDlg';
    optDlg.id = 'userscript-pswmgrDlg';
    optDlg.style.display = 'none';
    document.body.appendChild(optDlg);

    let listHtml = newAccountList.map(item => `
        <div class="list-item" acid="${item.id}">
            <p class="item-title">${item.username} (${item.host})</p>
            <p class="item-delbtn" acid="${item.id}" title="移除">${ICONS.del}</p>
        </div>
    `).join('');

    optDlg.innerHTML = `
        <div style="height:fit-content; max-height:calc(80vh - 60px); overflow-x:hidden; overflow-y:auto;">
            <h3>管理</h3>
            <div style="height:fit-content; margin:5px;">
                <p class="subtitle">已保存的账户：</p>
                ${listHtml}
            </div>
        </div>
        <div align="right">
            <input type="button" value="取消" class="ctrlbtn" id="userscript-cancelBtn">
            <input type="button" value="导出" class="ctrlbtn" id="userscript-exportBtn">
            <input type="button" value="保存" class="ctrlbtn" id="userscript-saveBtn">
        </div>
    `;

    optDlg.style.display = 'block';

    document.addEventListener('click', onClick);

    function onClick(e) {
        if (e.target.parentElement.className == "item-delbtn" || e.target.parentElement.parentElement.className == "item-delbtn") {
            let btnEle = (e.target.parentElement.className == "item-delbtn") ? e.target.parentElement : e.target.parentElement.parentElement;
            console.log(btnEle)
            const acid = btnEle.getAttribute("acid");
            const index = findByKeyValue(newAccountList, 'id', acid);
            if (index !== -1) {
                newAccountList.splice(index, 1);
                btnEle.parentElement.remove();
            }
        }

        if (e.target.id === 'userscript-cancelBtn') {
            newAccountList = origAccountList; // 恢复原始账户列表
            closeDialog();
        }

        if (e.target.id === 'userscript-saveBtn') {
            savedAccount = newAccountList; // 更新全局账户列表
            GM_setValue('savedAccount', savedAccount);
            Toast("已保存，刷新页面以应用更改");
            closeDialog();
        }

        if (e.target.id === 'userscript-exportBtn') {
            exportAccountData();
            Toast("即将导出为csv文件，请注意下载");
        }
    }

    function closeDialog() {
        const optDlg = document.getElementById("userscript-pswmgrDlg");
        optDlg.style.display = 'none';
        setTimeout(() => {
            optDlg.remove();
            document.removeEventListener('click', onClick);
        }, 110);
    }
}


function initEle(form, cx, cy) {
    // 创建搜索栏元素并添加到页面
    const quickFill = document.createElement('div');
    quickFill.className = 'userscript-quickFill';
    quickFill.id = 'userscript-quickFill';
    document.body.appendChild(quickFill);

    let html = '';
    const host = getHost();
    savedAccount.forEach(item => {
        if (item.host === host) {
            html += `<div class="item" acid="${item.id}">${item.username}</div>`;
        }
    });

    // 设定快速填充栏HTML内容
    quickFill.innerHTML = `
        <font color="#333333" size="small">&nbsp;保存的密码:</font>
        ${html}
        <div class="hideBtn">[隐藏]</div>
    `;

    // 设置快速填充栏位置
    quickFill.style.left = `${cx}px`;
    quickFill.style.top = `${cy}px`;

    // 选择保存过的第一个账号，自动填充到网页
    const formdata = getFormData(form);
    let dataindex = findByKeyValue(savedAccount, 'host', host);
    if (dataindex !== -1) {
        formdata.psw.value = savedAccount[dataindex].password;
        formdata.usr.value = savedAccount[dataindex].username;
    }

    // 添加点击事件监听器
    quickFill.addEventListener('click', function (e) {
        if (e.target.matches('.item')) {
            const acid = e.target.getAttribute("acid");
            let dataindex = findByKeyValue(savedAccount, 'id', acid);
            formdata.psw.value = savedAccount[dataindex].password;
            formdata.usr.value = savedAccount[dataindex].username;
        }

        if (e.target.matches('.hideBtn')) {
            quickFill.style.display = 'none';
        }
    });
}

function init() {
    let judgeRes = isLoginPage();

    if (judgeRes.isLogin) {
        /* 存储初始化 */
        console.log("【提示】检测到登录页面");
        initEle(judgeRes.obj, judgeRes.x, judgeRes.y);

        judgeRes.obj.addEventListener('submit', function (e) {
            // 获取表单输入内容
            const formdata = getFormData(judgeRes.obj);
            const newdata = {
                "id": hash(getHost() + formdata.username + formdata.password).toString(),
                "host": getHost(),
                "username": formdata.username,
                "password": formdata.password
            };

            // 检查是否数据重复
            const oldidx = findByKeyValue(savedAccount, "host", newdata.host);
            if (oldidx !== -1 && savedAccount[oldidx] && savedAccount[oldidx].id === newdata.id) {
                return;
            }

            // 如果不是重复账号，则询问是否保存
            let res = window.confirm("【询问】是否保存账号？");
            if (res) {
                // 保存账户
                savedAccount.push(newdata);
                GM_setValue('savedAccount', savedAccount);

                Toast("账号已保存！");
            }
        });
    }
}



/* =====[ 菜单注册 ]===== */
var menu_mgr = GM_registerMenuCommand('⚙️ 管理密码', function () { showPswMgr(); }, 'o');


(function () {
    'use strict';

    if(GM_getValue('savedAccount') == null || GM_getValue('savedAccount') == "" || GM_getValue('savedAccount') == undefined){ GM_setValue('savedAccount', savedAccount); }
    else { savedAccount = GM_getValue('savedAccount'); }

    var websiteThemeColor = "#FFFFFFEE";
    var websiteFontColor = "#000";

    GM_addStyle(`
        body{ -webkit-appearance:none!important; }

        .userscript-quickFill{ user-select:none; background-color:` + websiteThemeColor + `; color:` + websiteFontColor + `; border:1px solid #99999999; padding:2px; font-size:12px; line-height:20px; width:180px; height:fit-content; position:absolute; display:flex; flex-direction:column; overflow:hidden auto; box-sizing:border-box; z-index:100000; font-family:"Hiragino Sans GB","Microsoft YaHei","WenQuanYi Micro Hei",sans-serif; border-radius:5px; box-shadow:0px 0px 5px #666; }
        .userscript-quickFill>.item{ margin:1px 0px; border-radius:5px; padding:5px 9px; width:100%; flex-basis:fit-content; flex-shrink:0; cursor:pointer; background-color:transparent; box-sizing:border-box }
        .userscript-quickFill>.item:hover{ background-color:rgba(128, 128, 128, 0.2); }
        .userscript-quickFill>.hideBtn{ margin:1px 0px; padding:5px 9px; width:100%; flex-basis:fit-content; flex-shrink:0; color:` + websiteFontColor + `; opacity:0.6; font-size:12px; font-weight:bold; box-sizing:border-box; cursor:pointer; }

        .userscript-pswmgrDlg{ user-select:none; background-color:` + websiteThemeColor + `; color:` + websiteFontColor + `; border:1px solid #99999999; position:fixed; top:50%; height:fit-content; left:50%; transform:translateX(-50%) translateY(-50%); width:92vw; max-width:300px; max-height:92vh; padding:15px; border-radius:15px; box-sizing:initial; z-index:100000; box-shadow:0 1px 10px #00000088; font-family:"Hiragino Sans GB","Microsoft YaHei","WenQuanYi Micro Hei",sans-serif; }
        .userscript-pswmgrDlg .ctrlbtn{ border:none; background-color:transparent; padding:8px; margin:0; color:#6d7fb4; cursor:pointer; overflow:hidden; }
        .userscript-pswmgrDlg h3{ margin:5px; margin-bottom:15px; font-size:24px; }
        .userscript-pswmgrDlg .subtitle{ margin:5px 1px; font-size:16px; font-weight:400; }

        .userscript-pswmgrDlg .list-item{ width:calc(100% - 10px); padding:10px 5px; margin:0; display:flex; flex-direction:row; vertical-align:middle; box-sizing:initial; }
        .userscript-pswmgrDlg .list-item:hover{ background-color:#55555555; }
        .userscript-pswmgrDlg .list-item>p{ padding:0; margin:0; font-size:16px; }
        .userscript-pswmgrDlg .list-item>.item-title{ flex-grow:1; margin-left:5px; }

        .userscript-pswmgrDlg .list-item>.item-delbtn{ cursor:pointer; width:25px; }
        .userscript-pswmgrDlg .list-item>.item-delbtn svg{ fill:` + websiteFontColor + `; height:100%; min-height:16px; }
    `);

    init();

    setTimeout(function () {
        if (document.querySelectorAll(".userscript-quickFill").length === 0) {
            init();
        }
    }, 1000);


})();
