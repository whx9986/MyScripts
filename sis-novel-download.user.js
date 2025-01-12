// ==UserScript==
// @name         sis小说下载
// @namespace    https://github.com/whx9986/MyScripts
// @version      3.4
// @description  爬取SIS 1楼文字并生成TXT文件，支持手机和电脑端适配。
// @author       ChatGPT
// @match        http*://*.sis001.com/*/thread-*
// @match        http*://*.sis001.com/*/viewthread*
// @grant        GM_addStyle
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/whx9986/MyScripts/main/sis-novel-download.user.js
// @downloadURL  https://raw.githubusercontent.com/whx9986/MyScripts/main/sis-novel-download.user.js
// ==/UserScript==

(function () {
    'use strict';

    // 添加样式
    GM_addStyle(`
      .download-container {
        position: fixed;
        bottom: 150px;
        right: 20px;
        z-index: 9999;
        background-color: #007bff;
        color: white;
        width: 50px;
        height: 50px;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        text-align: center;
        cursor: pointer;
        transition: transform 0.1s;
        box-shadow: 0 0 8px rgba(0, 123, 255, 0.7);
        user-select: none;
      }
      .download-container:active {
        box-shadow: 0 0 12px 4px rgba(255, 255, 0, 0.8);
      }
    `);

    // 创建悬浮窗
    const container = document.createElement('div');
    container.className = 'download-container';
    container.innerHTML = `
      <span>下载</span>
      <span>TXT</span>
    `;
    document.body.appendChild(container);

    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;
    let isDragging = false;

    // 处理移动端触摸事件
    container.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
    });

    container.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        moveTo(touch.clientX, touch.clientY);
    });

    container.addEventListener('touchend', function() {
        isDragging = false;
    });

    // 处理PC端鼠标事件
    container.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        moveTo(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', function() {
        if (!isDragging) return;
        isDragging = false;
    });

    // 开始拖动
    function startDrag(x, y) {
        isDragging = true;
        startX = x;
        startY = y;
        const rect = container.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
    }

    // 移动到新位置
    function moveTo(x, y) {
        const deltaX = x - startX;
        const deltaY = y - startY;

        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;

        // 边界检查
        const maxX = window.innerWidth - container.offsetWidth;
        const maxY = window.innerHeight - container.offsetHeight;

        newLeft = Math.max(0, Math.min(maxX, newLeft));
        newTop = Math.max(0, Math.min(maxY, newTop));

        container.style.left = newLeft + 'px';
        container.style.top = newTop + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    }

    // 点击事件处理
    let moveDistance = 0;
    container.addEventListener('mousedown', function(e) {
        moveDistance = 0;
    });

    container.addEventListener('mousemove', function() {
        moveDistance += 1;
    });

    container.addEventListener('mouseup', function() {
        if (moveDistance < 5) {
            fetchFirstPost();
        }
        moveDistance = 0;
    });

    // 移动端点击处理
    let touchStartTime;
    let touchStartPos;

    container.addEventListener('touchstart', function(e) {
        touchStartTime = new Date().getTime();
        touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    });

    container.addEventListener('touchend', function(e) {
        const touchEndTime = new Date().getTime();
        const touchEndPos = {
            x: e.changedTouches[0].clientX,
            y: e.changedTouches[0].clientY
        };

        const moveDistance = Math.sqrt(
            Math.pow(touchEndPos.x - touchStartPos.x, 2) +
            Math.pow(touchEndPos.y - touchStartPos.y, 2)
        );

        // 如果移动距离小于10px且时间小于200ms，认为是点击
        if (moveDistance < 10 && touchEndTime - touchStartTime < 200) {
            fetchFirstPost();
        }
    });

    // 爬取1楼内容
    function fetchFirstPost() {
        try {
            console.log("开始爬取1楼内容");

            // 适配手机端和电脑版的内容提取
            let postContentElement = document.querySelector('th[id^="postmessage_"]'); // 手机端
            if (!postContentElement) {
                postContentElement = document.querySelector('.postmessage.defaultpost .t_msgfont'); // 电脑版
            }

            if (!postContentElement) {
                alert('未找到1楼内容，可能需要登录或权限不足！');
                return;
            }

            const postContent = postContentElement.innerText.trim(); // 提取完整文本内容
            const postTitle = formatTitle(document.title.trim()); // 格式化标题作为文件名

            // 清理无关内容，仅保留标题、作者和正文
            const cleanedContent = cleanContent(postTitle, postContent);

            // 格式化文件名和内容
            const fileName = `${postTitle}.txt`;
            const fileContent = cleanedContent;

            // 保存为TXT文件
            saveAsFile(fileName, fileContent);
        } catch (error) {
            console.error('爬取失败:', error);
            alert('爬取失败，请检查页面结构或脚本！');
        }
    }

    // 格式化标题函数
    function formatTitle(title) {
        const sanitizedTitle = title.split(' - ')[0].trim();
        return sanitizedTitle.replace(/[\/\\?%*:|"<>]/g, '_'); // 过滤非法字符
    }

    // 清理无关内容函数
    function cleanContent(title, content) {
        content = content
            .replace(new RegExp(`^${title}`, 'g'), '') // 删除标题重复部分
            .replace(/版主提醒：.*?[\r\n]+/g, '') // 删除版主提醒
            .replace(/本帖最近评分记录[\s\S]*$/g, '') // 删除评分记录及之后内容
            .replace(/附件:.*您所在的用户组无法下载或查看附件.*(\r?\n)?/g, '') // 删除附件信息
            .replace(/\[ 本帖最后由 .*? 编辑 \]/g, '') // 删除编辑信息
            .replace(/\n{3,}/g, '\n\n') // 删除多余空行，保留段落间一个空行
            .replace(/^\s+|\s+$/g, ''); // 删除行首行尾空白

        // 解析HTML实体
        content = decodeHTML(content);

        // 提取作者和正文内容
        const authorMatch = content.match(/作者：(.+)/);
        const author = authorMatch ? `作者：${authorMatch[1]}` : '作者：未知';

        const bodyStartIndex = content.indexOf('作者：') + author.length;
        const bodyContent = content.slice(bodyStartIndex).trim();

        return `${title}\n\n${author}\n\n${bodyContent}`;
    }

    // HTML解码函数
    function decodeHTML(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    // 保存文件函数
    function saveAsFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement('a');
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
})();
