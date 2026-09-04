import { resolveVoiceEntity } from './resolveVoiceSelection.js';

export function createPatientSelectionActions({
  hospitals,
  doctors,
  selectedHospital,
  selectedDoctor,
  hospitalAliases,
  openTab,
  onHospital,
  onDoctor,
  onCrossHospitalDoctor,
  onDoctorProfile,
  onCrossHospitalDoctorProfile
}) {
  const resolveDoc = (command) => {
    const local = selectedHospital?.doctors || [];
    const labels = item => [item.name, item.specialty, item.speciality];
    return resolveVoiceEntity(local, command, labels) || resolveVoiceEntity(doctors, command, labels);
  };

  return {
    selectHospital(command) {
      const hospital = resolveVoiceEntity(hospitals, command, hospitalAliases);
      if (!hospital) return false;
      openTab('appointments');
      onHospital(hospital);
      return true;
    },
    selectDoctor(command) {
      const local = selectedHospital?.doctors || [];
      const doctor = resolveDoc(command);
      if (!doctor) return false;

      const isProfile = Boolean(
        command?.isProfile ||
        command?.intent === 'view_doctor_profile' ||
        command?.intent === 'doctor_profile' ||
        command?.intent === 'open_doctor_profile' ||
        /\b(?:profile|bio|about|details|jankari|vivaram|parichay)\b/i.test(command?.raw || command?.value || '')
      );

      if (isProfile) {
        if (local.some(item => item.id === doctor.id)) {
          (onDoctorProfile || onDoctor)(doctor);
        } else {
          (onCrossHospitalDoctorProfile || onCrossHospitalDoctor)(doctor);
        }
      } else {
        openTab('appointments');
        if (local.some(item => item.id === doctor.id)) onDoctor(doctor);
        else onCrossHospitalDoctor(doctor);
      }
      return true;
    },
    openDoctorProfile(command) {
      const local = selectedHospital?.doctors || [];
      let doctor = resolveDoc(command);
      if (!doctor && (command?.value || command?.raw)) {
        const cleanQuery = String(command.value || command.raw || '').replace(/\b(?:profile|open|view|show|doctor|dr|kholo|dikhao)\b/gi, '').trim();
        if (cleanQuery) {
          const labels = item => [item.name, item.specialty, item.speciality];
          doctor = resolveVoiceEntity(local, { value: cleanQuery }, labels) || resolveVoiceEntity(doctors, { value: cleanQuery }, labels);
        }
      }
      if (!doctor) {
        doctor = selectedDoctor || (local.length > 0 ? local[0] : (doctors && doctors.length > 0 ? doctors[0] : null));
      }
      if (!doctor) return false;
      if (local.some(item => item.id === doctor.id)) {
        (onDoctorProfile || onDoctor)(doctor);
      } else {
        (onCrossHospitalDoctorProfile || onCrossHospitalDoctor)(doctor);
      }
      return true;
    }
  };
}
