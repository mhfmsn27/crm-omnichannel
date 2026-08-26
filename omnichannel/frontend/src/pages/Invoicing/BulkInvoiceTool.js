import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { Upload, Play, FileSpreadsheet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Added 'embedded' prop to handle layout adjustment
export default function BulkInvoiceTool({ embedded = false }) {
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Lock check removed as parent page handles it

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        setFile(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const jsonData = XLSX.utils.sheet_to_json(ws);
            
            // Map to standard format
            const formatted = jsonData.map(row => ({
                phone: row['Phone'] || row['No WA'] || '',
                name: row['Name'] || row['Nama'] || '',
                amount: row['Amount'] || row['Jumlah'] || 0,
                desc: row['Description'] || row['Keterangan'] || 'Tagihan',
                date: row['DueDate'] || ''
            })).filter(r => r.phone && r.amount > 0);
            
            setData(formatted);
        };
        reader.readAsBinaryString(file);
    };

    const handleProcess = async () => {
        if (data.length === 0) return toast.error("No valid data found");
        setLoading(true);
        try {
            const res = await axios.post('/api/app/invoices/bulk', { 
                batch_name: `Bulk ${new Date().toLocaleDateString()}`,
                items: data 
            });
            
            toast.success(`Created ${res.data.count} invoices! Redirecting to Broadcast...`);
            
            setTimeout(() => {
                navigate('/broadcast/create', { 
                    state: { 
                        targetType: 'invoice_batch', 
                        targetValue: res.data.batch_id,
                        messageTemplate: `Halo {name},\n\nBerikut tagihan Anda sebesar Rp {amount}. Jatuh tempo pada {due_date}.\n\nKlik link untuk bayar: {invoice_link}\n\nTerima kasih.`
                    } 
                });
            }, 1500);
            
        } catch (e) {
             toast.error("Bulk process failed: " + (e.response?.data?.error || e.message));
        } finally { setLoading(false); }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.json_to_sheet([
            { Phone: "62812345678", Name: "Budi", Amount: 150000, Description: "Iuran Mei", DueDate: "2025-05-20" }
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "invoice_template.xlsx");
    };

    const wrapperClass = embedded ? "w-full" : "p-8 max-w-4xl mx-auto";

    return (
        <div className={wrapperClass}>
            {!embedded && <h2 className="text-2xl font-bold text-gray-800 mb-6">Bulk Invoicing</h2>}
            
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="mb-6">
                    <button onClick={downloadTemplate} className="text-indigo-600 font-bold text-sm hover:underline mb-4 block mx-auto">Download Excel Template</button>
                    <div className="border-2 border-dashed border-gray-300 p-8 rounded-xl hover:bg-gray-50 transition-colors relative">
                        <input type="file" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="pointer-events-none">
                            {file ? (
                                <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                                    <FileSpreadsheet className="w-6 h-6" /> {file.name}
                                </div>
                            ) : (
                                <div className="text-gray-400">
                                    <Upload className="w-10 h-10 mx-auto mb-2" />
                                    <p className="font-medium text-gray-600">Click or Drag Excel File Here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {data.length > 0 && (
                    <div className="mb-6 text-left bg-gray-50 p-4 rounded-lg border border-gray-100 max-h-60 overflow-y-auto custom-scrollbar">
                        <p className="font-bold mb-2 text-sm text-gray-600 sticky top-0 bg-gray-50 pb-1 border-b">{data.length} Valid Rows Detected:</p>
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-gray-500 border-b"><th className="pb-1 text-left">Phone</th><th className="pb-1 text-left">Name</th><th className="pb-1 text-right">Amount</th></tr>
                            </thead>
                            <tbody>
                                {data.map((row, i) => (
                                    <tr key={i}>
                                        <td className="py-1">{row.phone}</td>
                                        <td>{row.name}</td>
                                        <td className="text-right">{row.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <button 
                    onClick={handleProcess} 
                    disabled={loading || data.length === 0}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto shadow-lg shadow-indigo-200"
                >
                    {loading ? 'Processing...' : <>Generate Invoices & Broadcast <Play className="w-4 h-4" /></>}
                </button>
            </div>
        </div>
    );
}
