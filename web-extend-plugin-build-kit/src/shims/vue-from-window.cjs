/* 开发态：webpack resolve.alias 将 `vue` 指到此文件，与宿主共用 window.Vue */
'use strict'
module.exports = typeof window !== 'undefined' && window.Vue ? window.Vue : {}
