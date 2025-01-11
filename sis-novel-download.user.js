// ==UserScript==
// @name         sis小说下载
// @namespace    https://github.com/whx9986/MyScripts
// @version      3.3
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
        border-radius: 12px; /* 圆角 */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 12px; /* 字体大小 */
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 0 8px rgba(0, 123, 255, 0.7);
        user-select: none; /* 禁止选中文字 */
      }
      .download-container:active {
        box-shadow: 0 0 12px 4px rgba(255, 255, 0, 0.8); /* 点击时光圈效果 */
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

    // 点击按钮事件
    container.addEventListener('click', function () {
        fetchFirstPost();
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
            .replace(new RegExp(`^${title}`, 'g'), '')           // 删除标题重复部分
            .replace(/版主提醒：.*?[\r\n]+/g, '')              // 删除版主提醒
            .replace(/本帖最近评分记录[\s\S]*$/g, '')          // 删除评分记录及之后内容
            .replace(/附件:.*您所在的用户组无法下载或查看附件.*(\r?\n)?/g, '') // 删除附件信息
            .replace(/\[ 本帖最后由 .*? 编辑 \]/g, '')          // 删除编辑信息
            .replace(/\n{3,}/g, '\n\n')                         // 删除多余空行，保留段落间一个空行
            .replace(/^\s+|\s+$/g, '');                         // 删除行首行尾空白

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
