 PA / primary eye pulse
    if (base.primary && base.eye) {
      const s = 1 + Math.sin(t * 2.6) * 0.12;
      base.eye.scale.setScalar(s);
      if (base.tip) base.tip.scale.setScalar(0.9 + Math.sin(t * 3.1) * 0.15);
    }

    // gentle idle bob on whole robot group child (first is robot root)
    const robot = base.group.children[0];
    if (robot) {
      robot.position.y = Math.sin(t * 1.2 + base.group.position.x) * (active ? 0.04 : 0.02);
      robot.rotation.y = Math.sin(t * 0.4 + base.group.position.z) * 0.08;
    }

    for (const u of base.units) {
      const ud = u.userData;
      if (active) {
        const ang = t * ud.speed + ud.phase;
        u.position.x = Math.cos(ang) * ud.radius;
        u.position.z = Math.sin(ang) * ud.radius;
        u.position.y = 0.28 + Math.abs(Math.sin(ang * 2)) * 0.06;
        u.rotation.y = ang + Math.PI / 2;
        u.visible = true;
      } else {
        u.position.y = 0.28;
        u.rotation.y = t * 0.35;
        u.position.x = Math.cos(ud.phase) * 0.75;
        u.position.z = Math.sin(ud.phase) * 0.75;
      }
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

applyTheme(currentTheme === 'nightcity' ? 'city' : currentTheme);
poll();
setInterval(poll, 30000);
animate();
