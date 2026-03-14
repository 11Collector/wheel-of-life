import { useEffect, useState } from 'react';
import { db, collection, getDocs, query, orderBy } from './firebase';

function Dashboard({ onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, "user_reports"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="app-container"><p>กำลังดึงข้อมูลขุมทรัพย์...</p></div>;

  return (
    <div className="dashboard-container" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ color: '#800000' }}>📊 upskillwheel Admin Dashboard</h2>
      <p>จำนวนผู้ใช้งานทั้งหมด: <strong>{reports.length}</strong> คน</p>
      
      <button className="secondary-btn" onClick={onBack} style={{ marginBottom: '20px' }}>
        ⬅️ กลับหน้าหลัก
      </button>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#800000', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>วันที่</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th style={{ padding: '12px' }}>เป้าหมาย (Goal)</th>
              <th style={{ padding: '12px' }}>คะแนนเฉลี่ย</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontSize: '14px' }}>
                  {report.timestamp?.toDate().toLocaleDateString('th-TH')}
                </td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{report.email}</td>
                <td style={{ padding: '12px', fontSize: '14px' }}>{report.goal?.substring(0, 50)}...</td>
                <td style={{ padding: '12px' }}>
                  {(report.scores?.reduce((a, b) => a + b, 0) / 8).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;