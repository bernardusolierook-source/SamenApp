-- Draai dit ALLEEN als je de database al eerder had aangemaakt (v0.1).
-- Voegt de 'beide'-optie toe aan kaarten en taken.
alter table domains add column if not exists shared boolean not null default false;
alter table tasks   add column if not exists shared boolean not null default false;
