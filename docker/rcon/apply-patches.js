const fs = require('fs')
const path = require('path')

const appRoot = fs.realpathSync('/opt/rcon-web-admin')

const replaceInFile = ({ relativePath, from, to }) => {
  const filePath = path.join(appRoot, relativePath)
  const content = fs.readFileSync(filePath, 'utf8')

  if (!content.includes(from)) {
    throw new Error(
      `Failed to patch ${relativePath}: expected snippet not found`,
    )
  }

  fs.writeFileSync(filePath, content.replace(from, to))
}

replaceInFile({
  relativePath: 'public/scripts/view.js',
  from: `View.changeHash = function (newHash) {
    if (window.location.hash != "#" + newHash) {
        history.pushState({hash: newHash}, null, window.location.href.replace(/\\#.*/ig, "") + "#" + newHash);
    }
};`,
  to: `View.changeHash = function (newHash) {
    var targetHash = "#" + newHash;
    if (window.location.hash == targetHash) {
        return;
    }
    try {
        history.pushState({hash: newHash}, null, window.location.href.replace(/\\#.*/ig, "") + targetHash);
    } catch (error) {
        console.warn("history.pushState failed, falling back to location.hash", error);
        window.location.hash = targetHash;
    }
};`,
})

replaceInFile({
  relativePath: 'public/views/index.js',
  from: `            addWidget.append($('<option></option>').attr("value", i).text(widget.t("name")));
        }
    }
});`,
  to: `            addWidget.append($('<option></option>').attr("value", i).text(widget.t("name")));
        }
    }

    setTimeout(function () {
        if (pickServer.data("selectpicker")) {
            pickServer.selectpicker("refresh");
        }
        if (addWidget.data("selectpicker")) {
            addWidget.selectpicker("refresh");
        }
    }, 0);
});`,
})
