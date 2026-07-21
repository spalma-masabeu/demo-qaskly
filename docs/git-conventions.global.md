<!--
DO NOT EDIT — Sincronizado desde el plugin claude-toolkit.
Si quieres ver o personalizar estas convenciones para este repositorio, crea o edita docs/git-conventions.md.
Para cambiar el estándar global, haz un PR en https://github.com/bukhr/buk-skills.
-->
# Convenciones de git en la organización bukhr

## Branches

Siguen la estructura: `<TIPO>/[CODIGO-DE-ISSUE]<DESCRIPCION-DEL-BRANCH>`

El `CODIGO-DE-ISSUE` es el ID de Jira, en caso de existir. La `DESCRIPCION-DEL-BRANCH` es algo descriptivo y no tan largo.

### Clasificacion de los tipos de branch

Tipo          | Ejemplo                                                      | Descripción
------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------
`feat`        | `feat/rmcl-850-asignar-items-por-empleado`                   | Nuevas características o mejoras que tienen impacto en el usuario
`bugfix`      | `bugfix/error-al-editar-variable-empresa`                    | Correcciones a bugs no urgentes
`hotfix`      | `hotfix/error-500-eliminar-bono-activo-o-actualizar-trabajo` | Correcciones a bugs urgentes
`docs`        | `docs/guia-estilo-ramas`                                     | Mejoras a la documentación
`style`       | `style/hash-alignment`                                       | Modificaciones de estilos de código (por ejemplo activar una regla de rubocop).
`refactor`    | `refactor/invocacion-cell-class`                             | Cambios internos en el código que no tienen impacto para el usuario
`test`        | `test/agregar-test-servicios-template-forms`                 | Agrega, corrige o mejora tests
`perf`        | `perf/job-data-modifier`                                     | Cambios en el código que sólo mejoran la performance
`chore`       | `chore/num-workers`                                          | Cambios al proceso de build y herramientas auxiliares
`migration`   | `migration/agregar-columna-Y-a-modelo-X`                     | Migración individual para agregar cambios a la rama `migraciones/*` que está protegida.
`revert`      | `revert-5016-feat/rmcl-850-asignar-items-por-empleado`       | Revierte un cambio ya sea en `production` o en `master` por una funcionalidad incorrecta, el nombre de la branch es `revert-<n° pr>-<tipo>/<nombre de la rama>`
`cherry-pick` | `cherry-pick-6d8dcba`                                        | Toma un commit para llevarlo a otra rama `cherry-pick-<hash abreviado del commit>` es importante referenciar el PR que incorpora la feature en el PR del cherry-pick

Todas las ramas deben nacer desde `master`|`main` y sus merges apuntar a `master`|`main`, a excepción de los `hotfix`, que nacen y apuntan a `production`, y de los `revert` que pueden apuntar a `master`|`main` o `production`.

**Nota**: En caso de crear un `hotfix` a partir de la rama equivocada(`master`|`main`), es recomendable crear el `hotfix` nuevamente desde la rama `production`, lo mismo para los `bugfix`'s en `master`|`main`.

> **Nombres de Ramas Reservados:**
>
> Algunos de nuestros repositorios contienen nombres de rama reservados. Encontrá más informacion en docs/git-conventions.md del respositorio.
>
> **Sobre caracteres especiales:**
>
> Los nombres de ramas deben usar **solo caracteres ASCII** (`a-z`, `0-9`, `-`, `/`). Reemplazar caracteres acentuados por su equivalente sin acento (`ñ`→`n`, `á`→`a`, `é`→`e`, etc.) para evitar warnings de GitHub por caracteres ocultos.
>
> **Uso de mayúsculas:**
>
> Los nombres de ramas deben estar **completamente en minúsculas**, incluyendo el código de issue de Jira. Por ejemplo, `TL-1234` se convierte en `tl-1234`:
>
> - Correcto: `feat/tl-1234-nueva-funcionalidad`
> - Incorrecto: `feat/TL-1234-nueva-funcionalidad`

## Pull requests

### Título

Debe llevar un prefijo de tipo en minúscula, siguiendo el mismo criterio que las Branches: `feat`, `bugfix`, `hotfix`, etc. Después del prefijo, incluir la tarjeta de Jira (si es que existe) seguido de `:` y el resto del título, que debe ser bien explicado, humano, y entendible por cualquier persona en la empresa.

Algo como `feat: Cambia permisos empleados` no dice mucho, mejor algo como `feat XXX-123: Permite a los empleados descargar sus archivos cuando no están limitados por área`.

### Issues relacionados

El PR debe incluir un enlace al issue de Jira asociado. El formato esperado es una URL del tipo `https://buk.atlassian.net/browse/XXX-123` o una mención directa del key (`XXX-123`).

Si no existe issue asociado, indicarlo explícitamente con una frase como "Sin ticket de Jira asociado", "N/A" o "no aplica". Dejar el placeholder del template sin modificar no es válido.

### Descripción

Que el que tenga que hacer revisión entienda qué está revisando. Hay una [plantilla de PR](./pull-request-tpl.global.md) con la definición a incluir. Cada repositorio puede tener otras plantillas en la carpeta .github, ejemplo: `buk-webapp:.github/pull_request_template.md`.

### Revisión

Cuando se crea el pull request se asigna a alguien. Una vez terminada la revisión, el revisor debe agregar el label `A Revisar` si hay cambios a realizar. El autor del PR debe quitarlo cuando haga todas las correcciones pertinentes y haya resuelto todos los comentarios. Esto permite hacer seguimiento a cuales PR ya fueron revisadas, y cuales están pendientes de revisión.

Si el revisor no encuentra más observaciones y no dejará más comentarios debe hacer MERGE **eliminando la rama fuente**.

## Commits

En buk utilizamos el [commit message guideline](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines) de angular

### Mensajes en commits

Los mensajes de commit:

```text
<tipo>: <descripción>
  <BLANK LINE>
  <cuerpo>
  <BLANK LINE>
  <pie>
```

- Cada línea no debiera tener más de 100 caracteres para que se lea bien en Github.
- [Guia para escribir mejores mensajes de commits](https://github.com/RomuloOliveira/commit-messages-guide)

### Tipo de commits

El tipo nos ayuda a clasificar los commits. Los tipos son bastante similares a los tipos de rama:

- **feat**: Un nuevo feature
- **fix**: La corrección de un bug
- **docs**: Cambios en la documentación
- **style**: Cambios que no afectan el significado del código (espacios, indentación, etc.)
- **refactor**: Un cambio en el código que no agrega una funcionalidad ni corrige un bug
- **perf** Cambios en el código que sólo mejoran la performance
- **test**: Agrega, corrige o mejora tests
- **chore**: Cambios al proceso de build y herramientas auxiliares
- **migration**: Cambios en el código que representan pasos del proceso de migraciones

### Descripción de commits

Lo importante en una descripción de commit es que nos genera documentación. Esto se refleja cuando vemos el historial de cada línea mientras programamos (muy útil en VS Code) o cuando se hace una revisión global de los commits en un PR (la pestaña commits).

Por esto, para mejorar que todos tengamos una buena documentación a medida que construimos el código, debemos pensar en ambos casos y colocar una descripción que nos indique en breves palabras lo que hace y su contexto. Otra forma de pensarlo es responder la pregunta ¿qué estoy ganando con agregar este commit?.

Específicamente, debemos cumplir:
    - El idioma del mensaje debe ser español
    - Debe quedar implícito el contexto sobre lo que estoy trabajando.
    - Usamos el verbo infinitivo (terminación en -ar, -er, -ir, como: terminar, validar, añadir)
    - Separado por un espacio del contexto
    - Sin mayúscula al principio
    - Sin punto (.) al final
    - No más de 100 caracteres.

Descripciones Mejorables
    - eliminar ignored_columns y llenar columna --> ¿Qué columna y dónde la estoy ignorando?
    - agregar promedio por nivel organizacional --> Falta contexto
    - poder modificar custom attrs con incongruencias en la db --> Asumo que se podrán modificar todos los custom attrs

Buenas Descripciones
    - eliminar ignorar y llenar columna XX en perfiles de permisos
    - agregar promedio por nivel organizacional en procesos de evaluación
    - permitir modificar cuentas contables cuando se han eliminado tipos de atributo personalizado

> ❗️ Importante: Evitemos el uso de nombres de clases o módulos. Debe ser lo más humanizado posible.

### Contenido de Commits

Los mensajes de commit deben ser claros y explicativos, ofreciendo información valiosa para cualquier persona que en el futuro necesite entender **por qué** se realizó un cambio específico. Un buen mensaje de commit debería incluir:

- **Motivación del Cambio:** Explicar el por qué de lo que se está haciendo.
- **Metodología (si es compleja):** Describir cómo se realizó el cambio, en caso de ser un proceso complejo.
- **Referencias Externas (si existen):** Incluir enlaces a documentos o sitios relevantes (por ejemplo, dictámenes de la DT).
- **Referencias Internas (si existen):** Mencionar documentos o herramientas internas relevantes (por ejemplo, tickets de Jira, registros de Sentry).

Evitar mensajes de commits que:

- Hagan referencia a discusiones o situaciones sin documentación o enlaces accesibles.
- Simplemente repitan lo que ya está escrito en el código.
- Sean genéricos o poco informativos, como "corregir comentario de review", "fix" o "WIP".

#### Ejemplos de Buenos Mensajes de Commit

> **feat: Implementar caso de update de un job para mes abierto en change_form**
>
> change_form asumía que el trabajo inicia al inicio del mes. Se ajusta para empleados con fecha de ingreso en cualquier día del mes, cubriendo casos recientemente identificados.

Este mensaje nos indica que estaba asumiendo el código, y la información adicional que invalida ese supuesto.

> **feat: Añadir validación para empleados menores de 18 años**
>
> Se introduce una validación conforme a la ORD. Nº77/6, que exige para menores de 18 años trabajos ligeros que no perjudiquen su salud y desarrollo. Detalles en [https://www.dt.gob.cl/legislacion/1624/w3-article-95353.html](https://www.dt.gob.cl/legislacion/1624/w3-article-95353.html).

Este mensaje nos entrega información externa que justifica la decisión que se está tomando.

#### Ejemplos de Malos Mensajes de Commit

> **feat: Añadir validación para que suma de ponderaciones sea 100**

Falta explicación del por qué la suma debe ser exactamente 100.

> **feat: Implementar caso conversado en reunión**

Las conversaciones no documentadas no proporcionan contexto ni justificación.

> **feat: Añadir método suma en clase Calculadora**

El mensaje no aporta información adicional ni justifica la necesidad del método.
