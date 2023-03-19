const express = require('express')
const db = require('../modules/db_connection')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')

const router = express.Router()

router.use((req, res, next) => {
  next()
})

const getListData = async (req, res) => {
  let redirect = ''
  const perPage = 25
  let page = +req.query.page || 1

  // let queryObj = {}
  // let sqlWhere = ' WHERE 1 ' // 條件式的開頭

  //篩選搜尋

  if (page < 1) {
    redirect = req.baseUrl
  }
  //計算總筆數
  const [[{ totalRows }]] = await db.query(
    `SELECT COUNT (1) totalRows FROM member WHERE 1`
  )
  const totalPages = Math.ceil(totalRows / perPage)

  //抓指定頁數的資料
  let rows = []
  if (totalRows > 0) {
    if (page > totalPages) {
      redirect = req.baseUrl + `?page=` + totalPages
    }
    // const sql = (`SELECT * FROM member
    // WHERE 1
    // ORDER BY sid ASC
    // LIMIT ${(page - 1) * perPage},${perPage}`[rows] = await db.query(sql))
  }

  return {
    perPage,
    page,
    totalPages,
    totalRows,
    rows,
    redirect,
  }
}

router.get('/', async (req, res) => {
  const output = await getListData(req, res)
  if (output.redirect) {
    return res.redirect(output.redirect)
  }
  res.json(output) //呈現list表單
})

//驗證用的callback func
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  // console.log('authHeader', authHeader)
  const token = authHeader && authHeader.split(' ')[1]
  //check if thet token under 'BEARER' is valid
  if (!token) return res.sendStatus(402)
  //驗證（解碼）這個token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403) //有看到token但帳號密碼不正確
    req.user = user
    next()
  })
}
//FIXME
//可以抓到訂單細節資訊＋訂單內涵商品資訊細節的函式
const getUserOrder = async (req, res, oid) => {
  //FIXME
  // const sql = `SELECT trails.trail_name, trails.trail_img, trails.trail_short_describ, trails.price, batch.batch_start, batch.batch_end, order_detail.amount FROM order_detail JOIN batch ON order_detail.batch_sid = batch.sid JOIN trails ON batch.trail_sid = trails.sid WHERE order_detail.order_sid =? `
  const sql = `SELECT * FROM order_detail WHERE order_detail.order_sid=? `
  const [rows] = await db.query(sql, oid)
  console.log(rows)
  return rows
}
//抓取訂單order_list的函式
const getOrder = async (req, res, sid) => {
  const sql = `SELECT order_list.sid, order_list.order_date, order_list.member_sid, order_list.order_status_sid, order_list.total FROM order_list JOIN order_status ON order_list.order_status_sid = order_status.sid WHERE order_list.member_sid=? ORDER BY CASE WHEN order_status.sid=2 THEN 0 ELSE 1 END, order_status.sid ASC`
  const [rows] = await db.query(sql, sid)
  return rows
}
//  抓訂單比數資料的路由，用在HistoryOrderCard Component上
router.get('/me/order', authenticateToken, async (req, res) => {
  // if (!req.params.mid === req.user.accountId) return res.sendStatus(403)
  const sid = req.headers['sid']

  const rowsOrder = await getOrder(req, res, sid)


  // 訂單比數資料日期格式轉換
  const convertedRowsOrder = rowsOrder.map((v, i) => {
    const date = new Date(v.order_date)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const orderDateFormat = `${year}/${month}/${day}`
    return {
      ...v,
      orderDateFormat: orderDateFormat,
    }
  })

  let output = {
    orderSidData: convertedRowsOrder,
    // data: convertedRows,
    msg: '',
  }
  if (rowsOrder) {
    output = {
      orderSidData: convertedRowsOrder,
      // data: convertedRows,
      msg: 'success',
    }
  } else {
    output = {
      orderSidData: convertedRowsOrder,
      // data: convertedRows,
      msg: 'failed',
    }
  }
  // console.log(convertedRowsOrder)
  res.json(output)
})

//抓商品細節用的路由，用在HistoryProduct Component
router.get('/me/order/product-detail', authenticateToken, async (req, res) => {
  const sid = req.headers['sid']
  const orderId = req.headers['orderId']
  const rows = await getUserOrder(req, res, orderId)

  //  細節資料進行日期格式、訂單號碼格式轉換
  const convertedRows = rows.map((v, i) => {
    const startDate = new Date(v.batch_start)
    const endDate = new Date(v.batch_end)
    const orderDate = new Date(v.order_date)
    const orderSID = String(v.order_sid).padStart(3, '0')
    const Syear = startDate.getFullYear()
    const Eyear = endDate.getFullYear()
    const Oyear = orderDate.getFullYear()
    const Smonth = String(startDate.getMonth() + 1).padStart(2, '0')
    const Emonth = String(endDate.getMonth() + 1).padStart(2, '0')
    const Omonth = String(orderDate.getMonth() + 1).padStart(2, '0')
    const Sday = String(startDate.getDate()).padStart(2, '0')
    const Eday = String(endDate.getDate()).padStart(2, '0')
    const Oday = String(orderDate.getDate()).padStart(2, '0')
    const orderDateFormat = `${Oyear}/${Omonth}/${Oday}`
    const startDateFormat = `${Syear}/${Smonth}/${Sday}`
    const endDateFormat = `${Eyear}/${Emonth}/${Eday}`
    return {
      ...v,
      // orderDate: orderDateFormat,
      startDate: startDateFormat,
      endDate: endDateFormat,
      // orderSID: orderSID,
    }
  })

  let output = {
    data: convertedRows,
    msg: '',
  }
  if (rows) {
    output = {
      data: convertedRows,
      msg: 'success',
    }
  } else {
    output = {
      data: convertedRows,
      msg: 'failed',
    }
  }
  console.log(output)
  res.json(output)
})

router.get('/me/comment/:mid', authenticateToken, async (req, res) => {
  if (!req.params.mid === req.user.accountId) return res.sendStatus(403)
  const sql = `SELECT trails.trail_name, batch.batch_start, batch.batch_end, rating.score, rating.comment, rating.reply, order_list.sid FROM order_list JOIN rating ON order_list.member_sid = rating.member_sid JOIN order_detail ON order_detail.order_sid = order_list.sid JOIN batch ON batch.sid = order_detail.batch_sid JOIN trails ON trails.sid = rating.trails_sid WHERE rating.member_sid=? `
  const sql2 = `SELECT * FROM rating JOIN trails ON rating.trails_sid = trails.sid JOIN order_list ON order_list.member_sid = rating.member_sid AND order_list.order_status_sid = 2 JOIN batch ON batch.sid = rating.batch_sid WHERE rating.member_sid =? `
  // const sqlTrailName = `SELECT trails.trail_name,`
  const [rows] = await db.query(sql2, [req.params.mid])
  const convertedRows = rows.map((v, i) => {
    const startDate = new Date(v.batch_start)
    const endDate = new Date(v.batch_end)
    const Syear = startDate.getFullYear()
    const Eyear = endDate.getFullYear()
    const Smonth = String(startDate.getMonth() + 1).padStart(2, '0')
    const Emonth = String(endDate.getMonth() + 1).padStart(2, '0')
    const Sday = String(startDate.getDate()).padStart(2, '0')
    const Eday = String(endDate.getDate()).padStart(2, '0')
    const startDateFormat = `${Syear}/${Smonth}/${Sday}`
    const endDateFormat = `${Eyear}/${Emonth}/${Eday}`
    return {
      ...v,
      startDate: startDateFormat,
      endDate: endDateFormat,
    }
  })
  let output = { data: convertedRows, msg: '' }
  if (convertedRows && convertedRows.length) {
    output = { data: convertedRows, msg: 'success' }
    console.log(output)
    res.json(output)
  } else {
    output = { data: convertedRows, msg: 'failed' }
    console.log(output)
    res.json(output)
  }
})

//照片上傳 multer套件，儲存到固定路徑時才能使用diskStorage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/')
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const filename = Math.random().toString(36).substring(2, 10) + ext

    cb(null, filename)
  },
})
// const storage = multer.memoryStorage()
//設定Multer
const upload = multer({
  storage: storage,
  limits: { filesize: 2 * 1024 * 1024 },
})
// const setUserImg = async (req, res) => {}
//大頭照上傳的路由
router.post(
  '/me/upload',
  authenticateToken,
  upload.single('file'), //接收input name = file 的欄位來的資料，一個檔案
  async (req, res) => {
    let fileName = ''
    fileName = req.file.filename
    //FIXME blobFile 未定義
    // const blobFile = req.file.buffer
    // const authHeader = req.headers['authorization']
    const sid = req.headers['sid']
    //TODO 重複上傳要怎麼寫？
    const sql = 'UPDATE `member` SET `img`=? WHERE `sid`=? '
    const [result] = await db.query(sql, [fileName, sid]) //要亂碼的名字選fileName，BLOBfile is for 二進位資料存在db
    // console.log(req.file)
    //FIXME 上傳成功的告示
    const report = {
      code: 200,
      status: '上傳成功',
    }
    res.json({ report })
  }
)
// TODO 加上驗證（&動態路由？）
//需要抓大頭貼的路由？？
// router.get('/me/avatar', authenticateToken, async (req, res) => {
//   const sid = req.headers['sid']
//   const sql = 'SELECT `img` FROM `member` WHERE `sid`=?'
//   const [result] = await db.query(sql, [sid])
//   res.json(result[0])
// })
const getUserCoupon = async (req, res, sid) => {
  const sql =
    'SELECT coupon.sid AS coupon_sid, coupon_code, coupon_name, start_date_coup, end_date_coup, promo_name, coupon_status FROM coupon JOIN member_coupon ON member_coupon.coupon_sid = coupon.sid WHERE member_coupon.member_sid =? ORDER BY coupon.sid ASC'
  const [rows] = await db.query(sql, sid)
  // const convertedRows = [...rows]
  const convertedRows = rows.map((v, i) => {
    const startDate = new Date(v.start_date_coup)
    const endDate = new Date(v.end_date_coup)
    const Syear = startDate.getFullYear()
    const Eyear = endDate.getFullYear()
    const Smonth = String(startDate.getMonth() + 1).padStart(2, '0')
    const Emonth = String(endDate.getMonth() + 1).padStart(2, '0')
    const Sday = String(startDate.getDate()).padStart(2, '0')
    const Eday = String(endDate.getDate()).padStart(2, '0')
    const startDateFormat = `${Syear}-${Smonth}-${Sday}`
    const endDateFormat = `${Eyear}-${Emonth}-${Eday}`
    return {
      ...v,
      startDate: startDateFormat,
      endDate: endDateFormat,
    }
  })

  console.log(convertedRows)
  return convertedRows
}

router.get('/me/coupon', authenticateToken, async (req, res) => {
  const sid = req.headers['sid']
  const output = await getUserCoupon(req, res, sid)
  res.json(output)
})
//抓所有會員資料
router.get('/me/:mid', authenticateToken, async (req, res) => {
  if (!req.params.mid === req.user.accountId) return res.sendStatus(403)
  const sql = `SELECT * FROM member 
  WHERE sid=?`
  const [rows] = await db.query(sql, [req.params.mid])
  // const avatarFileName = rows[0].img

  // const imgOutput = Buffer.from(avatarFileName).toString('base64')
  // console.log('blobname', avatarFileName)
  if (rows && rows.length) {
    res.json(rows[0])
    // res.send({ imgOutput })
  } else {
    res.json({ msg: 'no data' })
  }
})

router.get('/api', async (req, res) => {
  res.json(await getListData(req, res))
})

module.exports = router
