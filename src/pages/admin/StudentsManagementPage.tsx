import React, { useState, useEffect } from 'react';
import { studentsApi } from '../../services/api';
import { Student, Loan } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { StudentCardScanModal } from '../../components/admin/StudentCardScanModal';
import {
  Users,
  Search,
  GraduationCap,
  Mail,
  Phone,
  BookmarkCheck,
  AlertTriangle,
  Clock,
  Eye,
  ScanLine,
  UserPlus,
  CreditCard,
  Building2,
} from 'lucide-react';

export const StudentsManagementPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Selected student for detail modal
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentLoans, setStudentLoans] = useState<Loan[]>([]);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const data = await studentsApi.getAll(searchQuery || undefined);
      setStudents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [searchQuery]);

  const handleOpenStudentDetails = async (st: Student) => {
    setSelectedStudent(st);
    try {
      setIsLoadingLoans(true);
      const full = await studentsApi.getById(st.id);
      setStudentLoans(full.loans || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingLoans(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Action */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-700" />
            Répertoire des Étudiants Adhérents
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des comptes académiques USMBA, quotas d'emprunts et inscription par scan de carte
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsScanModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-700 hover:bg-sky-800 active:bg-sky-900 text-white font-semibold text-xs rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2"
          >
            <ScanLine className="w-4 h-4 text-sky-200" />
            <span>Ajouter un étudiant (Scan Carte)</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, e-mail (@usmba.ac.ma), identifiant CNE..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white text-slate-900"
          />
        </div>
      </div>

      {/* Table of Students */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Chargement des étudiants...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700">Aucun étudiant trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Étudiant</th>
                  <th className="py-3 px-4">Identifiant CNE</th>
                  <th className="py-3 px-4">Filière EST</th>
                  <th className="py-3 px-4 text-center">Prêts en cours</th>
                  <th className="py-3 px-4 text-center">Retards</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map(st => {
                  const hasOverdue = (st.overdueLoansCount || 0) > 0;
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{st.user?.fullName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{st.user?.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                        {st.studentIdNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium text-slate-900">{st.department}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {st.academicYear && (
                            <span className="inline-flex items-center gap-0.5 text-slate-600">
                              <GraduationCap className="w-3 h-3 text-sky-600" />
                              {st.academicYear}
                            </span>
                          )}
                          {st.establishment && (
                            <span className="text-slate-400">· {st.establishment}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold tabular-nums text-slate-800">
                          {st.activeLoansCount || 0} / {st.maxLoans}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {hasOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {st.overdueLoansCount} en retard
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-700">À jour (0)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenStudentDetails(st)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 rounded border border-sky-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Consulter fiche
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Student Detail & Loan History */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={`Fiche de l'étudiant · ${selectedStudent?.user?.fullName || ''}`}
        subtitle={`Identifiant CNE : ${selectedStudent?.studentIdNumber || ''} · ${selectedStudent?.department || ''}`}
        maxWidth="xl"
      >
        {selectedStudent && (
          <div className="space-y-5 text-xs">
            {/* Student metadata summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Adresse Académique</span>
                <span className="font-semibold text-slate-800">{selectedStudent.user?.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Établissement & Filière</span>
                <span className="font-semibold text-slate-800">
                  {selectedStudent.establishment || 'EST Fès'} — {selectedStudent.department}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Année Universitaire</span>
                <span className="font-semibold text-slate-800">{selectedStudent.academicYear || '2024-2025'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Téléphone</span>
                <span className="font-semibold text-slate-800">{selectedStudent.phone || 'Non renseigné'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Réf. Carte / Numéro</span>
                <span className="font-mono font-semibold text-slate-800">
                  {selectedStudent.cardReference || selectedStudent.studentIdNumber}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Statut Quota</span>
                <span className="font-semibold text-slate-800">
                  {studentLoans.filter(l => l.status !== 'RETURNED').length} / {selectedStudent.maxLoans} emprunts
                </span>
              </div>
            </div>

            {/* Loan History */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-sky-700" />
                Historique de l'ensemble des emprunts ({studentLoans.length})
              </h3>

              {isLoadingLoans ? (
                <div className="py-6 text-center text-slate-500">Chargement de l'historique...</div>
              ) : studentLoans.length === 0 ? (
                <p className="text-slate-400 italic py-4 text-center border border-dashed rounded">
                  Aucun emprunt enregistré pour cet étudiant.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {studentLoans.map(loan => (
                    <div key={loan.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-800">{loan.book?.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Code-barres : <span className="font-mono">{loan.bookCopy?.barcode}</span> · Emprunté le :{' '}
                          {loan.loanDate} · Échéance : {loan.expectedReturnDate}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge type="loanStatus" value={loan.status} />
                        {loan.overdueDays > 0 && loan.status !== 'RETURNED' && (
                          <div className="text-[10px] font-bold text-rose-700 mt-0.5">
                            +{loan.overdueDays} jours de retard
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: New Student Registration via Student Card Scan */}
      <StudentCardScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onStudentCreated={created => {
          loadStudents();
          handleOpenStudentDetails(created);
        }}
        onViewExistingStudent={existing => {
          setIsScanModalOpen(false);
          handleOpenStudentDetails(existing);
        }}
      />
    </div>
  );
};
