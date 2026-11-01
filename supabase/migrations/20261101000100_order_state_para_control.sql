alter type estado_ot_enum add value if not exists 'para_control' before 'listo';

notify pgrst, 'reload schema';
