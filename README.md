# 🐟 Salmon Allocation System

A supply chain allocation interface that distributes limited stock across customer orders using priority rules and constraints.

---

## 🚀 Demo

👉 https://salmon-allocation-rouge.vercel.app/

---

## 📦 Features

### 🔹 Auto Allocation

* Priority: **EMERGENCY > OVERDUE > DAILY**
* FIFO within same type
* Respects:

  * Warehouse stock
  * Customer credit limit
* Supports:

  * Partial allocation
  * Multi-warehouse (WH-000)
  * Multi-supplier (SP-000)

---

### 🔹 Manual Allocation

* User can override allocation per order
* Manual allocation:

  * Updates stock & credit instantly
  * Is preserved when running Auto Allocate
  * Highlighted in UI

---

### 🔹 Dashboard

* Total orders
* Fill rate
* Allocated vs requested
* Remaining stock
* Warehouse stock bars

---

### 🔹 Logs

* Shows allocation result per order
* Includes:

  * Success / Fail
  * Reason (No stock, Credit limit, etc.)
  * Source: AUTO / MANUAL

---

## 🧠 Algorithm

1. Sort orders by:

   * Type priority (EMERGENCY → OVERDUE → DAILY)
   * Creation date (FIFO)

2. Apply manual allocations first:

   * Deduct stock
   * Deduct credit

3. Run auto allocation:

   * Skip manual orders
   * Allocate based on:

     * Available stock
     * Remaining credit

4. Ensure:

   * No stock overflow
   * No credit overflow

---

## 🛠 Tech Stack

* React + TypeScript
* Vite
* Tailwind CSS

---

## ▶️ Run Locally

```bash
npm install
npm run dev
```

---

## 📌 Notes

* Auto Allocate is disabled when stock = 0
* Manual allocation takes priority over auto
* Banker’s rounding applied to pricing

---

## 💡 Improvements (Future)

* Undo / redo manual changes
* Allocation strategy switch
* Backend integration
* Performance optimization for large datasets

---
