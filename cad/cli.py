"""Regenera un componente con otras medidas.

  python cad/cli.py mastil                               # base ilustrativo
  python cad/cli.py mastil --set n_pan_inf=10 --set Db=1.8
  python cad/cli.py piso_trabajo minimo                  # preset del JSON
  python cad/cli.py mastil rig10                      # falla: PENDIENTE (falta plano del fabricante)
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import params  # noqa: E402
from lib.equipo import load_spec  # noqa: E402
from components import carrier_huella, mastil, piso_trabajo  # noqa: E402

EQUIPOS = {"mastil": mastil, "piso_trabajo": piso_trabajo, "carrier_huella": carrier_huella}

if len(sys.argv) < 2 or sys.argv[1] not in EQUIPOS:
    sys.exit("uso: python cad/cli.py {%s} [preset] [--set K=V ...]" % "|".join(EQUIPOS))

equipo = sys.argv[1]
P, sfx = params.cli(equipo, EQUIPOS[equipo], sys.argv[2:])
res = EQUIPOS[equipo].main(load_spec(), P, sfx)
print("->", res[0])
