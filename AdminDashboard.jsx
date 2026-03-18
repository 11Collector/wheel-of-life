import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';

const AdminDashboard = ({ onBack }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ดึงข้อมูลจาก Firebase
  const fetchReports = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "user_reports"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(data);
    } catch (error) {
      console.error("Error fetching reports: ", error);
      alert("ดึงข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // ฟังก์ชันลบข้อมูล
  const handleDelete = async (id) => {
    if (window.confirm('คุณแน่ใจนะว่าจะลบข้อมูลชุดนี้?')) {
      try {
        await deleteDoc(doc(db, "user_reports", id));
        setReports(reports.filter(item => item.id !== id));
      } catch (error) {
        alert("ลบไม่สำเร็จ");
      }
    }
  };

  // ฟังก์ชัน Export CSV (สำหรับเอาไปเปิดใน Excel)
  const exportToCSV = () => {
    const headers = ["Date", "Email", "Goal", "Avg Score", "Focus Areas"];
    const rows = reports.map(r => [
      r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString('th-TH') : '',
      r.email || 'N/A',
      `"${r.goal?.replace(/"/g, '""')}"`, // กัน Error ถ้าในเป้าหมายมีเครื่องหมายคำพูด
      (r.currentScores?.reduce((a, b) => a + b, 0) / 8).toFixed(2),
      r.selectedFocusAreas?.join('/') || ''
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF สำหรับอ่านภาษาไทยใน Excel
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => { csvContent += row.join(",") + "\n"; });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wheel_of_life_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // กรองข้อมูลตาม Email
  const filteredReports = reports.filter(r => 
    r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="app-container"><div className="card"><p>กำลังโหลดข้อมูล Database...</p></div></div>
  );

  return (
    <div className="app-container" style={{ display: 'block', overflowY: 'auto', paddingTop: '40px' }}>
      <div className="card" style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ color: '#800000', fontSize: '24px', margin: 0 }}>📊 ระบบจัดการข้อมูลหลังบ้าน</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="secondary-btn" onClick={exportToCSV} style={{ backgroundColor: '#2e7d32', color: 'white', border: 'none' }}>💾 Export Excel</button>
            <button className="secondary-btn" onClick={onBack}>กลับหน้าหลัก</button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
            <input 
                type="text" 
                placeholder="🔍 ค้นหาด้วย Email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
        </div>

        <p style={{ fontSize: '14px' }}>ผู้ใช้งานทั้งหมด: <strong>{reports.length}</strong> คน (ค้นพบ {filteredReports.length})</p>

        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #eee' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#800000', color: 'white' }}>
              <tr>
                <th style={{ padding: '12px' }}>วันที่</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>เป้าหมาย</th>
                <th style={{ padding: '12px' }}>คะแนนเฉลี่ย</th>
                <th style={{ padding: '12px' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id} style={{ borderBottom: '1px solid #eee' }} className="table-row-hover">
                  <td style={{ padding: '12px' }}>{report.timestamp?.toDate ? report.timestamp.toDate().toLocaleDateString('th-TH') : '-'}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{report.email || <span style={{color: '#aaa'}}>N/A</span>}</td>
                  <td style={{ padding: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.goal}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {report.currentScores ? (report.currentScores.reduce((a, b) => a + b, 0) / 8).toFixed(1) : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                        onClick={() => handleDelete(report.id)}
                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontWeight: 'bold' }}
                    >ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
