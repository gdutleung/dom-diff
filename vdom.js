// 节点类型
const VNodeType = {
  HTML: 'HTML',
  TEXT: 'TEXT',

  COMPONENT: 'COMPONENT',
  CLASS_COMPONENT: 'CLASS_COMPONENT',
}

// 子元素类型
const childType = {
  EMPTY: 'EMPTY',
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE',
}

/**
 * 创建虚拟dom
 * @param {*} tag 标签名
 * @param {*} attr 节点属性
 * @param {*} children 子元素
 */
function createElement(tag, attr, children) {
  let flag
  let childrenFlag

  if (typeof tag === 'string') {
    flag = VNodeType.HTML
  } else if (typeof tag === 'function') {
    flag = VNodeType.COMPONENT
  } else {
    flag = VNodeType.TEXT
  }

  if (children === null) {
    // 没有子节点
    childrenFlag = childType.EMPTY
  } else if (Array.isArray(children)) {
    let length = children.length
    if (length === 0) {
      // 没有子节点
      childrenFlag = childType.EMPTY
    } else {
      //
      childrenFlag = childType.MULTIPLE
    }
  } else {
    // 文本节点
    childrenFlag = childType.SINGLE
    children = createTextNode(children + '')
  }

  return {
    flag,
    tag,
    key: attr && attr.key,
    attr,
    children,
    childrenFlag,
  }
}

/**
 * 新建文本类型的vnode
 * @param {} text
 */
function createTextNode(text) {
  return {
    flag: VNodeType.TEXT,
    tag: null,
    attr: null,
    children: text,
    childrenFlag: childType.EMPTY,
    el: null
  }
}

/**
 * 渲染
 * @param {*} vnode 要渲染的虚拟dom
 * @param {*} container 容器
 */
function render(vnode, container) {
  // 区分首次渲染和再次渲染
  if (container.vnode) {
    // 更新
    patch(container.vnode, vnode, container)
  } else {
    mount(vnode, container)
  }
  container.vnode = vnode
}

function patch(prev, next, container) {
  let nextFlag = next.flag
  let prevFlag = prev.flag

  // 直接替换
  if (nextFlag !== prevFlag) {
    replaceNode(prev, next, container)
  } else if (nextFlag === VNodeType.HTML) {
    patchElement(prev, next, container)
  } else if (nextFlag === VNodeType.TEXT) {
    patchText(prev, next, container)
  }
}

function patchElement(prev, next, container) {
  if (prev.tag !== next.tag) {
    replaceVNode(prev, next, container)
    return
  }
  let el = (next.el = prev.el)
  let prevAttr = prev.attr
  let nextAttr = next.attr
  if (nextAttr) {
    for (let key in nextAttr) {
      let prevVal = prevAttr[key]
      let nextVal = nextAttr[key]
      patchData(el, key, prevVal, nextVal)
    }
  }
  if (prevAttr) {
    for (let key in prevAttr) {
      let prevVal = prevAttr[key]
      if (prevVal && !nextAttr.hasOwnProperty(key)) {
        patchData(el, key, prevVal, null)
      }
    }
  }
  // data 更新完毕 开始更新子元素
  patchChildren(
    prev.childrenFlag,
    next.childrenFlag,
    prev.children,
    next.children,
    el
  )

}

// 更新子元素
function patchChildren(
  prevChildFlag,
  nextChildFlag,
  prevChildren,
  nextChildren,
  container
) {
  // 新旧子元素 （空的，一个，多个）分别对比
  switch (prevChildFlag) {
    case childType.SINGLE:
      switch (nextChildFlag) {
        case childType.SINGLE:
          patch(prevChildren, nextChildren, container)
          break;
        case childType.EMPTY:
          container.removeChild(prevChildren.el)
          break;
        case childType.MULTIPLE:
          container.removeChild(prevChildren.el)
          for (let i = 0; i < nextChildFlag.length; i++) {
            mount(nextChildren[i], container)
          }
          break;
      }
      break;
    case childType.EMPTY:
      switch (nextChildFlag) {
        case childType.SINGLE:
          mount(nextChildren, container)
          break;
        case childType.EMPTY:
          mount(nextChildren, container)
          break;
        case childType.MULTIPLE:
          for (let i = 0; i < nextChildren.length; i++) {
            mount(nextChildren[i], container)
          }
          break;
      }
      break;
    case childType.MULTIPLE:
      switch (nextChildFlag) {
        case childType.SINGLE:
          for (let i = 0; i < prevChildren.length; i++) {
            container.removeChild(prevChildren[i].el)
          }
          mount(nextChildren, container)
          break;
        case childType.EMPTY:
          for (let i = 0; i < prevChildren.length; i++) {
            container.removeChild(prevChildren[i].el)
          }
          break;
        case childType.MULTIPLE:
          // 新旧都是数组
          let lastIndex = 0
          for (let i = 0; i < nextChildren.length; i++) {
            let nextVnode = nextChildren[i]
            let j = 0
            let find = false
            for (j; j < prevChildren.length; j++) {
              let preVnode = prevChildren[j]
              if (preVnode.key === nextVnode.key) {
                find = true
                // key相同，认为是同一个元素
                patch(preVnode, nextVnode, container)
                if (j < lastIndex) {
                  // 需要移动
                  let flagNode = nextChildren[i - 1].el.nextSibling
                  container.insertBefore(preVnode.el, flagNode)
                } else {
                  lastIndex = j
                }
              }
            }
            if (!find) {
              // 需要新增的
              let flagNode = i == 0 ? prevChildren[0].el : nextChildren[i - 1].el.nextSibling
              mount(nextVnode, container)
            }
          }
          // 移除不需要的元素
          for (let i = 0; i < prevChildren.length; i++) {
            const preVnode = prevChildren[i]
            const has = nextChildren.find(next => next.key === preVnode.key)
            if (!has) {
              container.removeChild(preVnode.el)
            }
          }

          break;
      }
      break;
  }
}

function patchText(prev, next, container) {
  // let el = (next.el = prev.el)
  if (next.children !== prev.children) {
    debugger
    container.nodeValue = next.children
  }
}

// 替换节点
function replaceNode(prev, next, container) {
  container.removeChild(prev.el)
  mount(next, container)
}

// 首次挂载元素
function mount(vnode, container, flagNode) {
  let { flag } = vnode
  if (flag === VNodeType.HTML) {
    mountElement(vnode, container, flagNode)
  } else if (flag === VNodeType.TEXT) {
    mountText(vnode, container)
  }
}

// 挂载元素
function mountElement(vnode, container, flagNode) {
  let dom = document.createElement(vnode.tag)
  vnode.el = dom

  let { attr, children, childrenFlag } = vnode

  // 挂载data属性
  if (attr) {
    for (let key in attr) {
      patchData(dom, key, null, attr[key])
    }
  }

  if (childrenFlag !== childType.EMPTY) {
    if (childrenFlag === childType.SINGLE) {
      mount(children, dom)
    } else if (childrenFlag === childType.MULTIPLE) {
      for (let i = 0; i < children.length; i++) {
        mount(children[i], dom)
      }
    }
  }
  flagNode ? container.insertBefore(dom, flagNode) : container.appendChild(dom)
}

// 挂载文字节点
function mountText(vnode, container) {
  let dom = document.createTextNode(vnode.children)
  container.appendChild(dom)
}

function patchData(el, key, prev, next) {
  switch (key) {
    case 'style':
      next = next || {}
      for (let k in next) {
        el.style[k] = next[k]
      }
      for (let k in prev) {
        if (!next.hasOwnProperty(k)) {
          el.style[k] = ''
        }
      }
      break
    case 'class':
      el.className = next
      break

    default:
      if (key[0] === '@') {
        if (prev) {
          el.removeEventListener(key.slice(1), prev)
        }
        if (next) {
          el.addEventListener(key.slice(1), next)
        }
      } else {
        el.setAttribute(key, next)
      }
      break
  }
}
